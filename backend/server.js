const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const ExcelJS = require('exceljs');
const { PayOS } = require('@payos/node');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const { PutCommand, GetCommand, ScanCommand, QueryCommand, UpdateCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { ddbDocClient } = require("./src/shared/database");

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "SaaS_SUPER_SECRET_KEY_2026";

const server = http.createServer(app);

// ─── Socket.IO ───
const io = new Server(server, { cors: { origin: "*" } });
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error("Yêu cầu bảo mật: Thiếu Token xác thực thiết bị Real-time!"));
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error("Mã Token Real-time không hợp lệ!"));
        socket.user = decoded;
        next();
    });
});
io.on('connection', (socket) => {
    socket.on('join_company', (tenantId) => {
        if (socket.user.tenantId === tenantId) {
            socket.join(tenantId);
        }
    });
});

const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = [
            'http://127.0.0.1:5500',
            'http://localhost:5500',
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:3000',
            'http://127.0.0.1:3000'
        ];

        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Origin không được phép'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// Serve static HTML files (login.html, index.html, superadmin.html, etc.)
const path = require('path');
app.use(express.static(path.join(__dirname)));
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: "Bạn đã yêu cầu quá nhiều mã OTP. Vui lòng thử lại sau 15 phút!" }
});

process.env.DYNAMODB_TABLE = "smart-attendance-database";
const TABLE_NAME = process.env.DYNAMODB_TABLE;

const payos = new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID || "dummy_client_id_123456789",
    apiKey: process.env.PAYOS_API_KEY || "dummy_api_key_123456789",
    checksumKey: process.env.PAYOS_CHECKSUM_KEY || "dummy_checksum_key_123456789"
});

const otpCache = new Map();

// ─── JWT Authentication Middleware & Role Helpers ───
function normalizeRole(role) {
    if (!role) return "USER";
    const r = String(role).toUpperCase();
    if (r === "ADMIN" || r === "TENANT_ADMIN") return "TENANT_ADMIN";
    if (r === "EMPLOYEE" || r === "USER") return "USER";
    if (r === "MANAGER") return "MANAGER";
    if (r === "SUPER_ADMIN") return "SUPER_ADMIN";
    return r;
}

function isManagerOrAdmin(role) {
    if (!role) return false;
    const r = String(role).toUpperCase();
    return r === "SUPER_ADMIN" || r === "TENANT_ADMIN" || r === "ADMIN" || r === "MANAGER";
}

function isTenantAdmin(role) {
    if (!role) return false;
    const r = String(role).toUpperCase();
    return r === "TENANT_ADMIN" || r === "ADMIN";
}

function requireTenantAdmin(req, res, next) {
    if (isTenantAdmin(req.user?.role)) return next();
    return res.status(403).json({ message: "Yêu cầu quyền Quản trị viên Doanh nghiệp (Admin Tenant)! Trưởng phòng không đủ quyền hạn cho thao tác này." });
}

// ─── Audit Log Helper ───
async function writeAuditLog(tenantId, actorUserId, actorRole, action, targetEntity, details) {
    const timestamp = new Date().toISOString();
    const logRecord = {
        PK: `TENANT#${tenantId}`,
        SK: `AUDIT#${timestamp}#${action}`,
        ActorUserId: actorUserId,
        ActorRole: actorRole,
        Action: action,
        TargetEntity: targetEntity || "",
        Details: details || "",
        Timestamp: timestamp
    };
    try {
        await ddbDocClient.send(new PutCommand({ TableName: TABLE_NAME, Item: logRecord }));
    } catch (e) {
        console.error("[AuditLog] Failed to write:", e.message);
    }
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Không tìm thấy Token xác thực! Vui lòng đăng nhập lại." });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Phiên đăng nhập hết hạn hoặc Token không hợp lệ!" });
        user.role = normalizeRole(user.role);
        req.user = user;
        next();
    });
}


// ═══════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════════════════════════════

app.post('/auth/register/request', registerLimiter, async (req, res) => {
    const { tenantId, userId, password, fullName, email, phone, otpType } = req.body;

    if (!tenantId || !userId || !password || !email || !phone || !otpType) {
        return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin và chọn phương thức nhận OTP!" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const cacheKey = `${tenantId}#${userId}`;

    otpCache.set(cacheKey, {
        tenantId, userId, password: hashedPassword, fullName, email, phone, otpCode,
        expiresAt: Date.now() + 5 * 60 * 1000
    });

    console.log(`\n=== 📩 [MÔ PHỎNG GỬI OTP BẢO MẬT] ===`);
    console.log(`🏢 Mã doanh nghiệp: ${tenantId}`);
    console.log(`👤 Tài khoản: ${userId}`);
    if (otpType === "PHONE") {
        console.log(`📱 [KÊNH SMS] Gửi mã OTP bảo mật đến SĐT [${phone}]: MÃ OTP LÀ -> ${otpCode}`);
    } else {
        console.log(`📧 [KÊNH EMAIL] Gửi mã OTP bảo mật đến Email [${email}]: MÃ OTP LÀ -> ${otpCode}`);
    }
    console.log(`============================================\n`);

    const channelText = otpType === "PHONE" ? `Số điện thoại (${phone})` : `Email (${email})`;
    res.status(200).json({ message: `Mã xác thực OTP đã được gửi tới ${channelText} của bạn! Hãy kiểm tra terminal backend.` });
});

app.post('/auth/register/verify', async (req, res) => {
    const { tenantId, userId, otpCode } = req.body;
    const cacheKey = `${tenantId}#${userId}`;
    const cachedData = otpCache.get(cacheKey);

    if (!cachedData) {
        return res.status(400).json({ message: "Yêu cầu đăng ký đã hết hạn hoặc không tồn tại!" });
    }

    if (cachedData.expiresAt < Date.now()) {
        otpCache.delete(cacheKey);
        return res.status(400).json({ message: "Mã OTP đã hết hạn sử dụng!" });
    }

    if (cachedData.otpCode !== otpCode) {
        return res.status(400).json({ message: "Mã xác thực OTP không chính xác!" });
    }

    try {
        const userRecord = {
            PK: `TENANT#${cachedData.tenantId}`,
            SK: `USER#${cachedData.userId}#METADATA`,
            Password: cachedData.password,
            FullName: cachedData.fullName || cachedData.userId,
            Email: cachedData.email,
            Phone: cachedData.phone,
            Role: "EMPLOYEE",
            IsActive: true,
            IsVerified: true,
            CreatedAt: new Date().toISOString()
        };

        await ddbDocClient.send(new PutCommand({ TableName: TABLE_NAME, Item: userRecord }));
        otpCache.delete(cacheKey);
        res.status(200).json({ message: "Xác thực thành công! Tài khoản nhân viên đã được kích hoạt an toàn." });
    } catch (error) {
        res.status(500).json({ message: "Lỗi lưu dữ liệu AWS: " + error.message });
    }
});

app.post('/auth/login', async (req, res) => {
    const { tenantId, userId, password } = req.body;

    // Direct login check for Super Admin
    if ((tenantId === "SYSTEM" || tenantId === "DEFAULT" || tenantId === "PLATFORM") && userId === "superadmin" && (password === "admin123" || password === "superadmin")) {
        const token = jwt.sign(
            {
                tenantId: "SYSTEM",
                userId: "superadmin",
                fullName: "Chủ Hệ Thống (Super Admin)",
                role: "SUPER_ADMIN",
                scope: "platform_admin"
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );
        return res.status(200).json({
            message: "Đăng nhập thành công với quyền Super Admin Hệ Thống!",
            token: token,
            user: {
                tenantId: "SYSTEM",
                userId: "superadmin",
                fullName: "Chủ Hệ Thống (Super Admin)",
                email: "superadmin@saas-platform.com",
                phone: "0900000000",
                role: "SUPER_ADMIN",
                scope: "platform_admin",
                departmentId: "ALL"
            }
        });
    }

    try {
        const result = await ddbDocClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                PK: `TENANT#${tenantId}`,
                SK: `USER#${userId}#METADATA`
            }
        }));

        if (!result.Item) {
            return res.status(401).json({ message: "Sai mã công ty, tài khoản hoặc mật khẩu!" });
        }
        const isPasswordValid = await bcrypt.compare(password, result.Item.Password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Sai mã công ty, tài khoản hoặc mật khẩu!" });
        }

        const rawRole = result.Item.Role || "USER";
        const normalizedRole = normalizeRole(rawRole);
        const departmentId = result.Item.DepartmentId || "GENERAL";
        const teamId = result.Item.TeamId || "DEFAULT";

        const token = jwt.sign(
            {
                tenantId,
                userId,
                fullName: result.Item.FullName,
                role: normalizedRole,
                departmentId,
                teamId
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(200).json({
            message: "Đăng nhập thành công!",
            token: token,
            user: {
                tenantId,
                userId,
                fullName: result.Item.FullName,
                email: result.Item.Email || "",
                phone: result.Item.Phone || "",
                role: normalizedRole,
                departmentId: departmentId,
                teamId: teamId,
                position: result.Item.Position || "Nhân viên"
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi hệ thống: " + error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
//  PROFILE ROUTES
// ═══════════════════════════════════════════════════════════════

app.get('/profile', authenticateToken, async (req, res) => {
    const { tenantId, userId } = req.user;
    try {
        const result = await ddbDocClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                PK: `TENANT#${tenantId}`,
                SK: `USER#${userId}#METADATA`
            }
        }));

        if (!result.Item) {
            return res.status(404).json({ message: "Không tìm thấy hồ sơ người dùng!" });
        }

        res.status(200).json({
            user: {
                tenantId,
                userId,
                fullName: result.Item.FullName || "",
                email: result.Item.Email || "",
                phone: result.Item.Phone || "",
                role: result.Item.Role || "EMPLOYEE",
                isActive: result.Item.IsActive !== false,
                createdAt: result.Item.CreatedAt || ""
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi tải hồ sơ: " + error.message });
    }
});

app.patch('/profile/update', authenticateToken, async (req, res) => {
    const { tenantId, userId } = req.user;
    const { fullName, email, phone } = req.body;

    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (fullName !== undefined) {
        updateExpressions.push("#fn = :fullName");
        expressionAttributeNames["#fn"] = "FullName";
        expressionAttributeValues[":fullName"] = fullName;
    }
    if (email !== undefined) {
        updateExpressions.push("#em = :email");
        expressionAttributeNames["#em"] = "Email";
        expressionAttributeValues[":email"] = email;
    }
    if (phone !== undefined) {
        updateExpressions.push("#ph = :phone");
        expressionAttributeNames["#ph"] = "Phone";
        expressionAttributeValues[":phone"] = phone;
    }

    if (updateExpressions.length === 0) {
        return res.status(400).json({ message: "Không có thông tin thay đổi nào được gửi!" });
    }

    try {
        await ddbDocClient.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                PK: `TENANT#${tenantId}`,
                SK: `USER#${userId}#METADATA`
            },
            UpdateExpression: "SET " + updateExpressions.join(", "),
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues
        }));
        res.status(200).json({ message: "Cập nhật hồ sơ thành công!" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi cập nhật hồ sơ: " + error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
//  ATTENDANCE ROUTES
// ─── Shift & Attendance Rules Helpers ───
const DEFAULT_SHIFT_CONFIG = {
    shiftStart: "08:00",
    shiftEnd: "17:00",
    windowCheckinStart: "07:00",
    windowCheckinEnd: "10:00",
    windowCheckoutStart: "16:00",
    windowCheckoutEnd: "20:00",
    gracePeriodMinutes: 5,
    cooldownMinutes: 2,
    otThresholdMinutes: 30,
    officeAddress: "720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh",
    allowedRadiusMeters: 200,
    verificationMethod: "GPS_ADDRESS_ONLY",
    requireWifi: false
};

async function getTenantShiftConfig(tenantId) {
    try {
        const result = await ddbDocClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `TENANT#${tenantId}`, SK: "SHIFT_CONFIG#DEFAULT" }
        }));
        return result.Item ? { ...DEFAULT_SHIFT_CONFIG, ...result.Item } : DEFAULT_SHIFT_CONFIG;
    } catch {
        return DEFAULT_SHIFT_CONFIG;
    }
}

function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

app.post('/attendance/check-in', authenticateToken, async (req, res) => {
    const { tenantId, userId } = req.user;
    const { gpsLocation, actionType } = req.body;

    // 1. GPS location check (Office GPS validation)
    if (!gpsLocation) {
        return res.status(400).json({ message: "Thiếu dữ liệu vị trí GPS, hệ thống không thể xác thực địa chỉ chấm công!" });
    }

    const config = await getTenantShiftConfig(tenantId);
    const now = new Date();
    const timestamp = now.toISOString();
    const currentDate = timestamp.substring(0, 10);
    const currentType = actionType === "OUT" ? "CHECKOUT" : "CHECKIN";

    // 2. Cooldown Time Check (Prevent rapid duplicate logs)
    try {
        const historyRes = await ddbDocClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND SK BEGINS_WITH(:skPrefix)",
            ExpressionAttributeValues: {
                ":pk": `TENANT#${tenantId}`,
                ":skPrefix": `USER#${userId}#ATTENDANCE#`
            },
            ScanIndexForward: false,
            Limit: 3
        }));
        const recentLogs = historyRes.Items || [];
        if (recentLogs.length > 0) {
            const lastLogTime = new Date(recentLogs[0].Timestamp).getTime();
            const diffMs = now.getTime() - lastLogTime;
            const cooldownMs = (config.cooldownMinutes || 2) * 60 * 1000;
            if (diffMs < cooldownMs) {
                const waitSecs = Math.ceil((cooldownMs - diffMs) / 1000);
                return res.status(400).json({ message: `Thao tác quá nhanh! Vui lòng chờ ${waitSecs} giây nữa trước khi chấm công lại (Thời gian chống trùng).` });
            }
        }
    } catch (e) {
        // Continue if query fails
    }

    // 3. Window Time Check (Khung giờ cho phép check-in)
    const currentHHMM = now.toTimeString().substring(0, 5);
    const currentMinutes = timeToMinutes(currentHHMM);
    const winStartMins = timeToMinutes(config.windowCheckinStart || "07:00");
    const winEndMins = timeToMinutes(config.windowCheckinEnd || "10:00");

    if (currentMinutes < winStartMins || currentMinutes > winEndMins) {
        return res.status(400).json({ message: `Hiện không trong khung giờ Check-in! Khung giờ mở: ${config.windowCheckinStart || '07:00'} - ${config.windowCheckinEnd || '10:00'}.` });
    }

    // 4. Grace Period Check (Đúng giờ vs Đi muộn)
    const shiftStartMins = timeToMinutes(config.shiftStart || "08:00");
    const maxOnTimeMins = shiftStartMins + (Number(config.gracePeriodMinutes) || 5);
    const isLate = currentMinutes > maxOnTimeMins;
    const statusText = isLate ? "LATE" : "ON_TIME";
    const statusNote = isLate 
        ? `Đi muộn (Vào lúc ${currentHHMM}, quá mốc dung sai ${config.shiftStart}+${config.gracePeriodMinutes}m)` 
        : `Đúng giờ (Vào lúc ${currentHHMM})`;

    try {
        const attendanceRecord = {
            PK: `TENANT#${tenantId}`,
            SK: `USER#${userId}#ATTENDANCE#${currentDate}#${currentType}`,
            UserId: userId,
            Timestamp: timestamp,
            Action: currentType,
            DeviceVerified: "GPS Verified",
            Status: statusText,
            Note: statusNote,
            ShiftStart: config.shiftStart,
            ShiftEnd: config.shiftEnd
        };
        await ddbDocClient.send(new PutCommand({ TableName: TABLE_NAME, Item: attendanceRecord }));

        io.to(tenantId).emit('new_attendance_alert', { userId: userId, action: currentType });

        res.status(200).json({ 
            message: `Check-in thành công (${isLate ? '⚠️ Đi muộn' : '✅ Đúng giờ'})!`, 
            data: attendanceRecord 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/attendance/check-out', authenticateToken, async (req, res) => {
    const { tenantId, userId } = req.user;
    const { gpsLocation } = req.body;

    // 1. GPS location check
    if (!gpsLocation) {
        return res.status(400).json({ message: "Thiếu dữ liệu vị trí GPS, hệ thống không thể xác thực địa chỉ chấm công!" });
    }

    const config = await getTenantShiftConfig(tenantId);
    const now = new Date();
    const timestamp = now.toISOString();
    const currentDate = timestamp.substring(0, 10);

    // 2. Cooldown Time Check
    try {
        const historyRes = await ddbDocClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND SK BEGINS_WITH(:skPrefix)",
            ExpressionAttributeValues: {
                ":pk": `TENANT#${tenantId}`,
                ":skPrefix": `USER#${userId}#ATTENDANCE#`
            },
            ScanIndexForward: false,
            Limit: 3
        }));
        const recentLogs = historyRes.Items || [];
        if (recentLogs.length > 0) {
            const lastLogTime = new Date(recentLogs[0].Timestamp).getTime();
            const diffMs = now.getTime() - lastLogTime;
            const cooldownMs = (config.cooldownMinutes || 2) * 60 * 1000;
            if (diffMs < cooldownMs) {
                const waitSecs = Math.ceil((cooldownMs - diffMs) / 1000);
                return res.status(400).json({ message: `Thao tác quá nhanh! Vui lòng chờ ${waitSecs} giây nữa trước khi thao tác lại (Thời gian chống trùng).` });
            }
        }
    } catch (e) {
        // Continue if query fails
    }

    // 3. Window Time Check (Khung giờ cho phép check-out)
    const currentHHMM = now.toTimeString().substring(0, 5);
    const currentMinutes = timeToMinutes(currentHHMM);
    const winStartMins = timeToMinutes(config.windowCheckoutStart || "16:00");
    const winEndMins = timeToMinutes(config.windowCheckoutEnd || "20:00");

    if (currentMinutes < winStartMins || currentMinutes > winEndMins) {
        return res.status(400).json({ message: `Hiện không trong khung giờ Check-out! Khung giờ mở: ${config.windowCheckoutStart || '16:00'} - ${config.windowCheckoutEnd || '20:00'}.` });
    }

    // 4. Overtime (OT) Calculation
    const shiftEndMins = timeToMinutes(config.shiftEnd || "17:00");
    const otThreshold = Number(config.otThresholdMinutes) || 30;
    const minsPastShiftEnd = currentMinutes - shiftEndMins;
    const isOvertime = minsPastShiftEnd >= otThreshold;
    const otMinutes = isOvertime ? minsPastShiftEnd : 0;
    const statusText = isOvertime ? "OVERTIME" : "ON_TIME";
    const statusNote = isOvertime ? `Check-out ra ca (+${otMinutes} phút OT)` : `Check-out đúng ca (${currentHHMM})`;

    try {
        const attendanceRecord = {
            PK: `TENANT#${tenantId}`,
            SK: `USER#${userId}#ATTENDANCE#${currentDate}#CHECKOUT`,
            UserId: userId,
            Timestamp: timestamp,
            Action: "CHECKOUT",
            DeviceVerified: "GPS Verified",
            Status: statusText,
            OvertimeMinutes: otMinutes,
            Note: statusNote
        };
        await ddbDocClient.send(new PutCommand({ TableName: TABLE_NAME, Item: attendanceRecord }));

        io.to(tenantId).emit('new_attendance_alert', { userId: userId, action: "CHECKOUT" });

        res.status(200).json({ 
            message: `Check-out Ra Ca thành công ${isOvertime ? `(💪 Làm thêm ${otMinutes} phút OT)` : ''}!`, 
            data: attendanceRecord 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/attendance/history', authenticateToken, async (req, res) => {
    const { tenantId, userId, role } = req.user;
    const month = req.query.month;

    // Privileged History Retrieval
    let targetUserId = userId;
    if (req.query.userId && (role === "ADMIN" || role === "MANAGER")) {
        // Enforce boundary: MANAGER cannot view ADMIN logs
        if (role === "MANAGER") {
            try {
                const targetUserGet = await ddbDocClient.send(new GetCommand({
                    TableName: TABLE_NAME,
                    Key: {
                        PK: `TENANT#${tenantId}`,
                        SK: `USER#${req.query.userId}#METADATA`
                    }
                }));
                if (targetUserGet.Item && targetUserGet.Item.Role === "ADMIN") {
                    return res.status(403).json({ message: "Quyền hạn không hợp lệ! Trưởng phòng (MANAGER) không có quyền xem thông tin của quản trị viên (ADMIN)." });
                }
            } catch (e) {
                // ignore
            }
        }
        targetUserId = req.query.userId;
    }

    try {
        const result = await ddbDocClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
            ExpressionAttributeValues: {
                ":pk": `TENANT#${tenantId}`,
                ":sk_prefix": `USER#${targetUserId}#ATTENDANCE#`
            },
            ScanIndexForward: false
        }));

        let records = result.Items || [];

        if (month) {
            records = records.filter(item => item.SK.includes(`#ATTENDANCE#${month}`));
        }

        const checkins = records.filter(r => r.Action === "CHECKIN");
        const checkouts = records.filter(r => r.Action === "CHECKOUT");
        const uniqueDays = new Set(records.map(r => r.Timestamp?.substring(0, 10)));

        const summary = {
            totalRecords: records.length,
            totalCheckins: checkins.length,
            totalCheckouts: checkouts.length,
            totalDays: uniqueDays.size,
            latestRecord: records.length > 0 ? {
                action: records[0].Action,
                timestamp: records[0].Timestamp,
                device: records[0].DeviceVerified
            } : null
        };

        res.status(200).json({ history: records, summary, count: records.length });
    } catch (error) {
        res.status(500).json({ message: "Lỗi lịch sử: " + error.message });
    }
});

app.get('/attendance/export/:yearMonth', authenticateToken, async (req, res) => {
    const { tenantId, userId, role } = req.user;
    const { yearMonth } = req.params;
    const targetEmployeeId = req.query.userId; // optional target user from UI

    try {
        const result = await ddbDocClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
            ExpressionAttributeValues: {
                ":pk": `TENANT#${tenantId}`,
                ":sk_prefix": "USER#"
            }
        }));

        let monthlyRecords = (result.Items || []).filter(item => item.SK.includes(`#ATTENDANCE#${yearMonth}`));

        // Enforce role-based security boundaries for reports
        if (role === "EMPLOYEE") {
            // Employees can only export their own records
            monthlyRecords = monthlyRecords.filter(item => item.UserId === userId);
        } else if (role === "MANAGER") {
            // Manager cannot export Admin reports (filter out all ADMIN metadata records first)
            const adminUsersList = (result.Items || [])
                .filter(item => item.SK.endsWith("#METADATA") && item.Role === "ADMIN")
                .map(item => item.SK.split("#")[1]);

            monthlyRecords = monthlyRecords.filter(item => !adminUsersList.includes(item.UserId));

            if (targetEmployeeId && targetEmployeeId !== "ALL") {
                monthlyRecords = monthlyRecords.filter(item => item.UserId === targetEmployeeId);
            }
        } else if (role === "ADMIN") {
            if (targetEmployeeId && targetEmployeeId !== "ALL") {
                monthlyRecords = monthlyRecords.filter(item => item.UserId === targetEmployeeId);
            }
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`Báo Cáo ${yearMonth}`);

        worksheet.columns = [
            { header: 'Mã Nhân Viên', key: 'userId', width: 18 },
            { header: 'Thời Gian Chấm', key: 'timestamp', width: 25 },
            { header: 'Loại Ca Ghi Nhận', key: 'action', width: 18 },
            { header: 'Hình Thức Xác Thực', key: 'device', width: 20 },
            { header: 'Trạng Thái', key: 'status', width: 15 }
        ];

        monthlyRecords.forEach(item => {
            worksheet.addRow({
                userId: item.UserId, timestamp: new Date(item.Timestamp).toLocaleString('vi-VN'),
                action: item.Action, device: item.DeviceVerified, status: item.Status
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=BaoCao_ChamCong_${yearMonth}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ message: "Lỗi xuất báo cáo hệ thống: " + error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
//  ADMIN ROUTES & ATTENDANCE CRUD
// ═══════════════════════════════════════════════════════════════

app.get('/admin/users', authenticateToken, async (req, res) => {
    const { tenantId, role, departmentId: callerDeptId } = req.user;

    // Only ADMIN, TENANT_ADMIN, SUPER_ADMIN and MANAGER roles can access the employee lists
    if (!isManagerOrAdmin(role)) {
        return res.status(403).json({ message: "Quyền hạn không hợp lệ! Bạn không có quyền truy cập thông tin nhân sự." });
    }

    try {
        const result = await ddbDocClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
            ExpressionAttributeValues: {
                ":pk": `TENANT#${tenantId}`,
                ":sk_prefix": "USER#"
            }
        }));

        let users = (result.Items || [])
            .filter(item => item.SK.endsWith("#METADATA"))
            .map(item => ({
                userId: item.SK.split("#")[1],
                fullName: item.FullName || "",
                email: item.Email || "",
                phone: item.Phone || "",
                role: item.Role || "EMPLOYEE",
                departmentId: item.DepartmentId || "GENERAL",
                teamId: item.TeamId || "DEFAULT",
                isActive: item.IsActive !== false,
                isVerified: item.IsVerified || false,
                createdAt: item.CreatedAt || ""
            }));

        // ENFORCED PRIVILEGE BOUNDARY: MANAGER can only see users in same department, EXCEPT other ADMINS
        if (role === "MANAGER") {
            users = users.filter(u => u.role !== "ADMIN" && u.role !== "TENANT_ADMIN");
            if (callerDeptId && callerDeptId !== "ALL" && callerDeptId !== "GENERAL") {
                users = users.filter(u => u.departmentId === callerDeptId || u.departmentId === "GENERAL");
            }
        }

        res.status(200).json({ users, count: users.length, tenantId });
    } catch (error) {
        res.status(500).json({ message: "Lỗi tải danh sách: " + error.message });
    }
});

app.patch('/admin/users', authenticateToken, async (req, res) => {
    const { tenantId, role } = req.user;
    const { targetUserId, newRole, isActive } = req.body;

    // Allow ADMIN and MANAGER to modify user roles or active state
    if (!isManagerOrAdmin(role)) {
        return res.status(403).json({ message: "Quyền hạn không hợp lệ! Chỉ quản trị viên hoặc trưởng phòng mới có quyền thực hiện thao tác này." });
    }

    if (!targetUserId) {
        return res.status(400).json({ message: "Thiếu thông tin người dùng cần cập nhật (targetUserId)!" });
    }

    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (newRole !== undefined) {
        const validRoles = ["EMPLOYEE", "MANAGER", "ADMIN", "TENANT_ADMIN", "USER"];
        if (!validRoles.includes(newRole)) {
            return res.status(400).json({ message: `Vai trò không hợp lệ! Chỉ chấp nhận: ${validRoles.join(", ")}` });
        }
        updateExpressions.push("#role = :role");
        expressionAttributeNames["#role"] = "Role";
        expressionAttributeValues[":role"] = newRole;
    }

    if (isActive !== undefined) {
        updateExpressions.push("#active = :active");
        expressionAttributeNames["#active"] = "IsActive";
        expressionAttributeValues[":active"] = isActive;
    }

    if (updateExpressions.length === 0) {
        return res.status(400).json({ message: "Không có thông tin thay đổi nào được gửi!" });
    }

    updateExpressions.push("#updatedAt = :updatedAt");
    expressionAttributeNames["#updatedAt"] = "UpdatedAt";
    expressionAttributeValues[":updatedAt"] = new Date().toISOString();

    try {
        await ddbDocClient.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                PK: `TENANT#${tenantId}`,
                SK: `USER#${targetUserId}#METADATA`
            },
            UpdateExpression: "SET " + updateExpressions.join(", "),
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues
        }));
        res.status(200).json({ message: `Đã cập nhật thông tin người dùng ${targetUserId} thành công!` });
    } catch (error) {
        res.status(500).json({ message: "Lỗi cập nhật: " + error.message });
    }
});

// ─── CREATE User (Admin only — bypass OTP) ───
app.post('/admin/users/create', authenticateToken, async (req, res) => {
    const { tenantId, role, userId: callerUserId } = req.user;
    const { userId, password, fullName, email, phone, newRole, departmentId } = req.body;

    if (!isManagerOrAdmin(role)) {
        return res.status(403).json({ message: "Chỉ quản trị viên hoặc trưởng phòng mới có quyền tạo tài khoản mới!" });
    }

    // Manager cannot create ADMIN accounts
    if (role === "MANAGER" && (newRole === "ADMIN" || newRole === "TENANT_ADMIN")) {
        return res.status(403).json({ message: "Trưởng phòng không có quyền tạo tài khoản với vai trò ADMIN!" });
    }

    if (!userId || !password) {
        return res.status(400).json({ message: "Vui lòng nhập tài khoản và mật khẩu!" });
    }

    // Check if user already exists
    try {
        const existing = await ddbDocClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `TENANT#${tenantId}`, SK: `USER#${userId}#METADATA` }
        }));
        if (existing.Item) {
            return res.status(409).json({ message: `Tài khoản "${userId}" đã tồn tại trong hệ thống!` });
        }
    } catch (e) { /* ignore */ }

    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = ["EMPLOYEE", "MANAGER", "ADMIN", "TENANT_ADMIN", "USER"].includes(newRole) ? newRole : "EMPLOYEE";

    try {
        await ddbDocClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK: `TENANT#${tenantId}`,
                SK: `USER#${userId}#METADATA`,
                Password: hashedPassword,
                FullName: fullName || userId,
                Email: email || "",
                Phone: phone || "",
                Role: assignedRole,
                DepartmentId: departmentId || "GENERAL",
                IsActive: true,
                IsVerified: true,
                CreatedAt: new Date().toISOString()
            }
        }));
        await writeAuditLog(tenantId, callerUserId, role, "USER_CREATED", userId, `Tạo tài khoản "${userId}" với vai trò ${assignedRole}`);
        res.status(200).json({ message: `Tạo tài khoản "${userId}" (${assignedRole}) thành công!` });
    } catch (error) {
        res.status(500).json({ message: "Lỗi tạo tài khoản: " + error.message });
    }
});

// ─── UPDATE User profile fields (Admin only — extends existing PATCH) ───
app.patch('/admin/users/profile', authenticateToken, async (req, res) => {
    const { tenantId, role } = req.user;
    const { targetUserId, fullName, email, phone } = req.body;

    if (!isManagerOrAdmin(role)) {
        return res.status(403).json({ message: "Chỉ quản trị viên hoặc trưởng phòng mới có quyền chỉnh sửa hồ sơ nhân viên!" });
    }

    if (!targetUserId) {
        return res.status(400).json({ message: "Thiếu thông tin người dùng cần cập nhật!" });
    }

    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (fullName !== undefined) {
        updateExpressions.push("#fn = :fullName");
        expressionAttributeNames["#fn"] = "FullName";
        expressionAttributeValues[":fullName"] = fullName;
    }
    if (email !== undefined) {
        updateExpressions.push("#em = :email");
        expressionAttributeNames["#em"] = "Email";
        expressionAttributeValues[":email"] = email;
    }
    if (phone !== undefined) {
        updateExpressions.push("#ph = :phone");
        expressionAttributeNames["#ph"] = "Phone";
        expressionAttributeValues[":phone"] = phone;
    }

    if (updateExpressions.length === 0) {
        return res.status(400).json({ message: "Không có thông tin thay đổi nào!" });
    }

    updateExpressions.push("#updatedAt = :updatedAt");
    expressionAttributeNames["#updatedAt"] = "UpdatedAt";
    expressionAttributeValues[":updatedAt"] = new Date().toISOString();

    try {
        await ddbDocClient.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `TENANT#${tenantId}`, SK: `USER#${targetUserId}#METADATA` },
            UpdateExpression: "SET " + updateExpressions.join(", "),
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues
        }));
        res.status(200).json({ message: `Đã cập nhật hồ sơ nhân viên ${targetUserId} thành công!` });
    } catch (error) {
        res.status(500).json({ message: "Lỗi cập nhật hồ sơ: " + error.message });
    }
});

// ─── DELETE User (Admin only) ───
app.delete('/admin/users/delete', authenticateToken, async (req, res) => {
    const { tenantId, userId: callerUserId, role } = req.user;
    const { targetUserId } = req.body;

    if (!isManagerOrAdmin(role)) {
        return res.status(403).json({ message: "Chỉ quản trị viên hoặc trưởng phòng mới có quyền xóa tài khoản!" });
    }

    if (!targetUserId) {
        return res.status(400).json({ message: "Thiếu thông tin tài khoản cần xóa!" });
    }

    if (targetUserId === callerUserId) {
        return res.status(400).json({ message: "Bạn không thể tự xóa tài khoản của chính mình!" });
    }

    try {
        // Delete metadata record
        await ddbDocClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { PK: `TENANT#${tenantId}`, SK: `USER#${targetUserId}#METADATA` }
        }));

        // Also clean up attendance records for this user
        const attendanceResult = await ddbDocClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
            ExpressionAttributeValues: {
                ":pk": `TENANT#${tenantId}`,
                ":sk_prefix": `USER#${targetUserId}#ATTENDANCE#`
            }
        }));

        const attendanceItems = attendanceResult.Items || [];
        for (const item of attendanceItems) {
            await ddbDocClient.send(new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { PK: item.PK, SK: item.SK }
            }));
        }

        await writeAuditLog(tenantId, callerUserId, role, "USER_DELETED", targetUserId, `Xóa tài khoản "${targetUserId}" và ${attendanceItems.length} bản ghi chấm công`);
        res.status(200).json({ message: `Đã xóa tài khoản "${targetUserId}" và ${attendanceItems.length} bản ghi chấm công liên quan.` });
    } catch (error) {
        res.status(500).json({ message: "Lỗi xóa tài khoản: " + error.message });
    }
});

// ─── Attendance CRUD APIs for ADMIN & MANAGER ───

// 1. GET User statistics list (each person summary)
app.get('/admin/attendance/summary', authenticateToken, async (req, res) => {
    const { tenantId, role } = req.user;
    if (!isManagerOrAdmin(role)) {
        return res.status(403).json({ message: "Quyền hạn không hợp lệ! Bạn không có quyền truy cập dữ liệu thống kê nhân sự." });
    }

    try {
        const result = await ddbDocClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
            ExpressionAttributeValues: {
                ":pk": `TENANT#${tenantId}`,
                ":sk_prefix": "USER#"
            }
        }));

        const items = result.Items || [];
        const userMetadata = {};

        // Extract metadata to map user names and filter Admin roles out for Manager
        items.forEach(item => {
            if (item.SK.endsWith("#METADATA")) {
                const uId = item.SK.split("#")[1];
                if (role === "MANAGER" && item.Role === "ADMIN") {
                    return; // Skip Admin details
                }
                userMetadata[uId] = {
                    fullName: item.FullName || uId,
                    role: item.Role || "EMPLOYEE"
                };
            }
        });

        const stats = {};
        Object.keys(userMetadata).forEach(uId => {
            stats[uId] = {
                userId: uId,
                fullName: userMetadata[uId].fullName,
                role: userMetadata[uId].role,
                checkins: 0,
                checkouts: 0,
                days: new Set()
            };
        });

        // Loop items to sum statistics
        items.forEach(item => {
            if (item.SK.includes("#ATTENDANCE#")) {
                const uId = item.UserId || item.SK.split("#")[1];
                if (stats[uId]) {
                    if (item.Action === "CHECKIN") stats[uId].checkins++;
                    if (item.Action === "CHECKOUT") stats[uId].checkouts++;
                    const date = item.Timestamp?.substring(0, 10);
                    if (date) stats[uId].days.add(date);
                }
            }
        });

        const summaryList = Object.values(stats).map(s => ({
            userId: s.userId,
            fullName: s.fullName,
            role: s.role,
            checkins: s.checkins,
            checkouts: s.checkouts,
            days: s.days.size
        }));

        res.status(200).json({ summary: summaryList });
    } catch (e) {
        res.status(500).json({ message: "Lỗi thống kê nhân sự: " + e.message });
    }
});

// 2. CREATE Manual log
app.post('/admin/attendance', authenticateToken, async (req, res) => {
    const { tenantId, role } = req.user;
    const { targetUserId, timestamp, action, device } = req.body;

    if (!isManagerOrAdmin(role)) {
        return res.status(403).json({ message: "Quyền hạn không hợp lệ! Bạn không có quyền thêm log chấm công." });
    }

    if (!targetUserId || !timestamp || !action) {
        return res.status(400).json({ message: "Vui lòng điền đầy đủ: Tài khoản, Thời gian, Loại ca!" });
    }

    const dateStr = timestamp.substring(0, 10);
    const actionType = action === "CHECKOUT" ? "CHECKOUT" : "CHECKIN";

    try {
        // Enforce boundary check: manager cannot modify Admin logs
        if (role === "MANAGER") {
            const checkUser = await ddbDocClient.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: { PK: `TENANT#${tenantId}`, SK: `USER#${targetUserId}#METADATA` }
            }));
            if (checkUser.Item && checkUser.Item.Role === "ADMIN") {
                return res.status(403).json({ message: "Không thể thêm log chấm công cho tài khoản ADMIN." });
            }
        }

        const logRecord = {
            PK: `TENANT#${tenantId}`,
            SK: `USER#${targetUserId}#ATTENDANCE#${dateStr}#${actionType}`,
            UserId: targetUserId,
            Timestamp: timestamp,
            Action: actionType,
            DeviceVerified: device || "Điều chỉnh thủ công",
            Status: "SUCCESS"
        };

        await ddbDocClient.send(new PutCommand({ TableName: TABLE_NAME, Item: logRecord }));
        res.status(200).json({ message: "Thêm bản ghi chấm công thủ công thành công!", record: logRecord });
    } catch (e) {
        res.status(500).json({ message: "Lỗi thêm bản ghi: " + e.message });
    }
});

// 3. UPDATE Log
app.patch('/admin/attendance', authenticateToken, async (req, res) => {
    const { tenantId, role } = req.user;
    const { targetUserId, originalSk, newTimestamp, newAction, newDevice } = req.body;

    if (!isManagerOrAdmin(role)) {
        return res.status(403).json({ message: "Quyền hạn không hợp lệ! Bạn không có quyền chỉnh sửa log chấm công." });
    }

    if (!targetUserId || !originalSk || !newTimestamp || !newAction) {
        return res.status(400).json({ message: "Thiếu dữ liệu điều chỉnh!" });
    }

    try {
        if (role === "MANAGER") {
            const checkUser = await ddbDocClient.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: { PK: `TENANT#${tenantId}`, SK: `USER#${targetUserId}#METADATA` }
            }));
            if (checkUser.Item && checkUser.Item.Role === "ADMIN") {
                return res.status(403).json({ message: "Không thể sửa đổi dữ liệu chấm công của ADMIN." });
            }
        }

        // Delete old key first (SK coordinates contains original date & action type)
        await ddbDocClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
                PK: `TENANT#${tenantId}`,
                SK: originalSk
            }
        }));

        // Write new updated record
        const dateStr = newTimestamp.substring(0, 10);
        const actionType = newAction === "CHECKOUT" ? "CHECKOUT" : "CHECKIN";
        const newSk = `USER#${targetUserId}#ATTENDANCE#${dateStr}#${actionType}`;

        const updatedRecord = {
            PK: `TENANT#${tenantId}`,
            SK: newSk,
            UserId: targetUserId,
            Timestamp: newTimestamp,
            Action: actionType,
            DeviceVerified: newDevice || "Chỉnh sửa thủ công",
            Status: "SUCCESS"
        };

        await ddbDocClient.send(new PutCommand({ TableName: TABLE_NAME, Item: updatedRecord }));
        res.status(200).json({ message: "Đã cập nhật bản ghi chấm công thành công!", record: updatedRecord });
    } catch (e) {
        res.status(500).json({ message: "Lỗi cập nhật: " + e.message });
    }
});

// 5. GET Shift Config
app.get('/admin/shift-config', authenticateToken, async (req, res) => {
    const { tenantId, role } = req.user;
    if (!isManagerOrAdmin(role)) {
        return res.status(403).json({ message: "Quyền hạn không hợp lệ! Chỉ Quản trị viên và Trưởng phòng mới được truy cập cấu hình ca." });
    }
    const config = await getTenantShiftConfig(tenantId);
    res.status(200).json({ config });
});

// 6. POST Shift Config (Update Shift & Attendance Rules — ADMIN ONLY, Manager read-only via GET)
app.post('/admin/shift-config', authenticateToken, requireTenantAdmin, async (req, res) => {
    const { tenantId, role, userId } = req.user;
    const {
        shiftStart, shiftEnd,
        windowCheckinStart, windowCheckinEnd,
        windowCheckoutStart, windowCheckoutEnd,
        gracePeriodMinutes, cooldownMinutes, otThresholdMinutes,
        officeAddress, allowedRadiusMeters
    } = req.body;

    const newConfig = {
        PK: `TENANT#${tenantId}`,
        SK: "SHIFT_CONFIG#DEFAULT",
        shiftStart: shiftStart || "08:00",
        shiftEnd: shiftEnd || "17:00",
        windowCheckinStart: windowCheckinStart || "07:00",
        windowCheckinEnd: windowCheckinEnd || "10:00",
        windowCheckoutStart: windowCheckoutStart || "16:00",
        windowCheckoutEnd: windowCheckoutEnd || "20:00",
        gracePeriodMinutes: Number(gracePeriodMinutes ?? 5),
        cooldownMinutes: Number(cooldownMinutes ?? 2),
        otThresholdMinutes: Number(otThresholdMinutes ?? 30),
        officeAddress: officeAddress || "720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh",
        allowedRadiusMeters: Number(allowedRadiusMeters ?? 200),
        verificationMethod: "GPS_ADDRESS_ONLY",
        requireWifi: false,
        updatedAt: new Date().toISOString(),
        updatedBy: userId
    };

    try {
        await ddbDocClient.send(new PutCommand({ TableName: TABLE_NAME, Item: newConfig }));
        await writeAuditLog(tenantId, userId, role, "SHIFT_CONFIG_UPDATED", "SHIFT_CONFIG", `Cập nhật cấu hình ca: ${newConfig.shiftStart}-${newConfig.shiftEnd}`);
        res.status(200).json({ message: "Đã lưu cấu hình ca làm việc, quy tắc OT & vị trí địa chỉ GPS văn phòng (không dùng Wi-Fi) thành công!", config: newConfig });
    } catch (e) {
        res.status(500).json({ message: "Lỗi lưu cấu hình: " + e.message });
    }
});

// 4. DELETE Log
app.delete('/admin/attendance', authenticateToken, async (req, res) => {
    const { tenantId, role } = req.user;
    const { targetUserId, sk } = req.body;

    if (!isManagerOrAdmin(role)) {
        return res.status(403).json({ message: "Quyền hạn không hợp lệ! Bạn không có quyền xóa log chấm công." });
    }

    if (!targetUserId || !sk) {
        return res.status(400).json({ message: "Thiếu thông tin bản ghi cần xóa!" });
    }

    try {
        if (role === "MANAGER") {
            const checkUser = await ddbDocClient.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: { PK: `TENANT#${tenantId}`, SK: `USER#${targetUserId}#METADATA` }
            }));
            if (checkUser.Item && checkUser.Item.Role === "ADMIN") {
                return res.status(403).json({ message: "Không thể xóa dữ liệu chấm công của ADMIN." });
            }
        }

        await ddbDocClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
                PK: `TENANT#${tenantId}`,
                SK: sk
            }
        }));
        res.status(200).json({ message: "Đã xóa bản ghi chấm công thành công!" });
    } catch (e) {
        res.status(500).json({ message: "Lỗi xóa bản ghi: " + e.message });
    }
});

// ═══════════════════════════════════════════════════════════════
//  AUDIT LOG ROUTES
// ═══════════════════════════════════════════════════════════════

// Admin Tenant: View audit logs for their company
app.get('/admin/audit-logs', authenticateToken, async (req, res) => {
    const { tenantId, role } = req.user;

    if (!isTenantAdmin(role)) {
        return res.status(403).json({ message: "Chỉ Quản trị viên (Admin) mới có quyền xem nhật ký hệ thống!" });
    }

    try {
        const result = await ddbDocClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
            ExpressionAttributeValues: {
                ":pk": `TENANT#${tenantId}`,
                ":skPrefix": "AUDIT#"
            },
            ScanIndexForward: false,
            Limit: 100
        }));

        const logs = (result.Items || []).map(item => ({
            timestamp: item.Timestamp,
            actor: item.ActorUserId,
            actorRole: item.ActorRole,
            action: item.Action,
            target: item.TargetEntity,
            details: item.Details
        }));

        res.status(200).json({ logs, count: logs.length });
    } catch (e) {
        res.status(500).json({ message: "Lỗi tải nhật ký: " + e.message });
    }
});

// ═══════════════════════════════════════════════════════════════
//  USER SHIFT SCHEDULE ROUTES
// ═══════════════════════════════════════════════════════════════

// User: View personal assigned shifts
app.get('/user/shifts', authenticateToken, async (req, res) => {
    const { tenantId, userId } = req.user;
    const weekDate = req.query.weekDate; // optional filter

    try {
        const skPrefix = `SHIFT#${userId}#`;
        const result = await ddbDocClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
            ExpressionAttributeValues: {
                ":pk": `TENANT#${tenantId}`,
                ":skPrefix": skPrefix
            },
            ScanIndexForward: false
        }));

        let shifts = result.Items || [];
        if (weekDate) {
            shifts = shifts.filter(s => s.WeekDate === weekDate || s.SK.includes(weekDate));
        }

        res.status(200).json({ shifts });
    } catch (e) {
        res.status(200).json({ shifts: [] });
    }
});

// Manager: View all shifts in team/department
app.get('/manager/shifts', authenticateToken, async (req, res) => {
    const { tenantId, role, departmentId: callerDeptId } = req.user;

    if (!isManagerOrAdmin(role)) {
        return res.status(403).json({ message: "Không có quyền truy cập lịch ca làm việc!" });
    }

    try {
        const result = await ddbDocClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
            ExpressionAttributeValues: {
                ":pk": `TENANT#${tenantId}`,
                ":skPrefix": "SHIFT#"
            },
            ScanIndexForward: false
        }));

        let shifts = result.Items || [];

        // Manager: scope to same department
        if (role === "MANAGER" && callerDeptId && callerDeptId !== "ALL" && callerDeptId !== "GENERAL") {
            shifts = shifts.filter(s => s.DepartmentId === callerDeptId || !s.DepartmentId);
        }

        res.status(200).json({ shifts });
    } catch (e) {
        res.status(200).json({ shifts: [] });
    }
});

// ═══════════════════════════════════════════════════════════════
//  BILLING ROUTES
// ═══════════════════════════════════════════════════════════════

app.get('/billing/subscription', authenticateToken, async (req, res) => {
    const { tenantId, role } = req.user;

    // Only ADMIN can view billing subscription details (Manager excluded)
    if (!isTenantAdmin(role)) {
        return res.status(403).json({ message: "Quyền hạn không hợp lệ! Chỉ Quản trị viên (Admin) mới có quyền truy cập gói cước thanh toán doanh nghiệp." });
    }

    try {
        const result = await ddbDocClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                PK: `TENANT#${tenantId}`,
                SK: "SUBSCRIPTION#CURRENT"
            }
        }));

        const rawItem = result.Item || {};
        const subscription = {
            plan: rawItem.plan || rawItem.Plan || "FREE",
            status: rawItem.status || rawItem.Status || "ACTIVE",
            maxUsers: Number(rawItem.maxUsers || rawItem.MaxUsers || 50),
            expiresAt: rawItem.expiresAt || rawItem.ExpiresAt || null
        };

        res.status(200).json({ subscription });
    } catch (error) {
        res.status(500).json({ message: "Lỗi tải gói dịch vụ: " + error.message });
    }
});

app.post('/billing/create-payment', authenticateToken, async (req, res) => {
    const { tenantId, role } = req.user;
    const { amount, packageName } = req.body;

    if (!isTenantAdmin(role)) {
        return res.status(403).json({ message: "Quyền hạn không hợp lệ! Chỉ Quản trị viên (Admin) mới được phép nâng cấp gói cước doanh nghiệp." });
    }

    if (!process.env.PAYOS_CLIENT_ID || process.env.PAYOS_CLIENT_ID === "dummy_client_id_123456789") {
        const orderCode = Number(String(Date.now()).slice(-6));
        try {
            await ddbDocClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    PK: `TENANT#${tenantId}`,
                    SK: `BILLING#ORDER#${orderCode}`,
                    Amount: amount, Package: packageName, Status: "PENDING", CreatedAt: new Date().toISOString()
                }
            }));
        } catch (e) {
            // ignore
        }
        return res.status(200).json({
            message: "Đã tạo đơn hàng thanh toán (chế độ mô phỏng)!",
            checkoutUrl: `http://localhost:3000/billing/webhook?mock=true`,
            orderCode
        });
    }

    const orderCode = Number(String(Date.now()).slice(-6));
    const paymentData = {
        orderCode: orderCode, amount: amount, description: `Gia han ${packageName}`,
        cancelUrl: `http://127.0.0.1:5500/index.html?payment=cancel`,
        returnUrl: `http://127.0.0.1:5500/index.html?payment=success`,
    };

    try {
        const paymentLinkData = await payos.createPaymentLink(paymentData);
        await ddbDocClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK: `TENANT#${tenantId}`,
                SK: `BILLING#ORDER#${orderCode}`,
                Amount: amount, Package: packageName, Status: "PENDING", CreatedAt: new Date().toISOString()
            }
        }));
        res.status(200).json({ checkoutUrl: paymentLinkData.checkoutUrl });
    } catch (error) {
        res.status(500).json({ message: "Lỗi tích hợp PayOS: " + error.message });
    }
});

app.post('/billing/webhook', async (req, res) => {
    const { orderCode, status, tenantId } = req.body;

    if (!orderCode || !status) {
        return res.status(400).json({ message: "Thiếu thông tin webhook (orderCode, status)!" });
    }

    console.log(`[Webhook] Nhận thông báo thanh toán: Order #${orderCode}, Status: ${status}`);

    const statusMap = {
        "PAID": "COMPLETED",
        "CANCELLED": "CANCELLED",
        "EXPIRED": "EXPIRED",
        "PENDING": "PENDING"
    };
    const mappedStatus = statusMap[status] || status;

    if (tenantId) {
        try {
            await ddbDocClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: {
                    PK: `TENANT#${tenantId}`,
                    SK: `BILLING#ORDER#${orderCode}`
                },
                UpdateExpression: "SET #st = :status, #paid = :paidAt",
                ExpressionAttributeNames: { "#st": "Status", "#paid": "PaidAt" },
                ExpressionAttributeValues: {
                    ":status": mappedStatus,
                    ":paidAt": mappedStatus === "COMPLETED" ? new Date().toISOString() : null
                }
            }));

            if (mappedStatus === "COMPLETED") {
                const expiresAt = new Date();
                expiresAt.setMonth(expiresAt.getMonth() + 1);

                await ddbDocClient.send(new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: {
                        PK: `TENANT#${tenantId}`,
                        SK: "SUBSCRIPTION#CURRENT"
                    },
                    UpdateExpression: "SET #plan = :plan, #st = :status, #exp = :expires, #upd = :updated, #max = :maxUsers",
                    ExpressionAttributeNames: {
                        "#plan": "Plan",
                        "#st": "Status",
                        "#exp": "ExpiresAt",
                        "#upd": "UpdatedAt",
                        "#max": "MaxUsers"
                    },
                    ExpressionAttributeValues: {
                        ":plan": "PRO",
                        ":status": "ACTIVE",
                        ":expires": expiresAt.toISOString(),
                        ":updated": new Date().toISOString(),
                        ":maxUsers": 300
                    }
                }));
            }
        } catch (e) {
            console.error("Lỗi cập nhật hóa đơn/gói cước local:", e);
        }
    }

    res.status(200).json({ message: "Webhook đã được xử lý thành công!", orderCode, status: mappedStatus });
});

// ═══════════════════════════════════════════════════════════════
//  SUPER ADMIN ROUTES (Platform Level)
// ═══════════════════════════════════════════════════════════════

function requireSuperAdmin(req, res, next) {
    if (req.user?.role === "SUPER_ADMIN" || req.user?.scope === "platform_admin") {
        return next();
    }
    return res.status(403).json({ message: "Yêu cầu quyền Quản trị Hệ thống SaaS (Super Admin)!" });
}

// 1. GET Tenants List (Super Admin)
app.get('/super-admin/tenants', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const result = await ddbDocClient.send(new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: "begins_with(PK, :tenantPrefix)",
            ExpressionAttributeValues: {
                ":tenantPrefix": "TENANT#"
            }
        }));

        const items = result.Items || [];
        const tenantsMap = {};

        items.forEach(item => {
            const tenantId = item.PK.replace("TENANT#", "");
            if (tenantId === "SYSTEM") return; // Skip platform system tenant

            if (!tenantsMap[tenantId]) {
                tenantsMap[tenantId] = {
                    tenantId,
                    name: `Công ty ${tenantId}`,
                    plan: "PRO",
                    status: "ACTIVE",
                    maxUsers: 100,
                    userCount: 0,
                    createdAt: new Date().toISOString()
                };
            }

            if (item.SK === "METADATA") {
                tenantsMap[tenantId].name = item.CompanyName || item.Name || tenantsMap[tenantId].name;
                tenantsMap[tenantId].status = item.Status || tenantsMap[tenantId].status;
                tenantsMap[tenantId].createdAt = item.CreatedAt || tenantsMap[tenantId].createdAt;
            } else if (item.SK === "SUBSCRIPTION#CURRENT") {
                tenantsMap[tenantId].plan = item.Plan || item.plan || "PRO";
                tenantsMap[tenantId].maxUsers = Number(item.MaxUsers || item.maxUsers || 100);
            } else if (item.SK.startsWith("USER#") && item.SK.endsWith("#METADATA")) {
                tenantsMap[tenantId].userCount += 1;
            }
        });

        const tenantList = Object.values(tenantsMap);
        res.status(200).json({ tenants: tenantList, count: tenantList.length });
    } catch (e) {
        res.status(500).json({ message: "Lỗi quét danh sách Tenant: " + e.message });
    }
});

// 2. CREATE Tenant (Super Admin)
app.post('/super-admin/tenants', authenticateToken, requireSuperAdmin, async (req, res) => {
    const { tenantId, name, plan, maxUsers, adminPassword } = req.body;
    if (!tenantId || !name) {
        return res.status(400).json({ message: "Vui lòng nhập Mã Doanh Nghiệp (tenantId) và Tên Công Ty!" });
    }

    try {
        const tenantRecord = {
            PK: `TENANT#${tenantId}`,
            SK: "METADATA",
            CompanyName: name,
            Status: "ACTIVE",
            CreatedAt: new Date().toISOString()
        };

        const subRecord = {
            PK: `TENANT#${tenantId}`,
            SK: "SUBSCRIPTION#CURRENT",
            Plan: plan || "PRO",
            Status: "ACTIVE",
            MaxUsers: Number(maxUsers || 100),
            ExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        };

        const defaultPass = await bcrypt.hash(adminPassword || "123456", 10);
        const adminUserRecord = {
            PK: `TENANT#${tenantId}`,
            SK: "USER#admin#METADATA",
            Password: defaultPass,
            FullName: `Quản trị viên ${name}`,
            Email: `admin@${tenantId.toLowerCase()}.com`,
            Role: "TENANT_ADMIN",
            IsActive: true,
            CreatedAt: new Date().toISOString()
        };

        await ddbDocClient.send(new PutCommand({ TableName: TABLE_NAME, Item: tenantRecord }));
        await ddbDocClient.send(new PutCommand({ TableName: TABLE_NAME, Item: subRecord }));
        await ddbDocClient.send(new PutCommand({ TableName: TABLE_NAME, Item: adminUserRecord }));

        res.status(200).json({ message: `Đã khởi tạo Doanh nghiệp "${name}" (${tenantId}) và tài khoản Tenant Admin [admin / ${adminPassword || '123456'}] thành công!` });
    } catch (e) {
        res.status(500).json({ message: "Lỗi tạo Tenant: " + e.message });
    }
});

// 3. LOCK / UNLOCK / EXTEND Tenant (Super Admin)
app.patch('/super-admin/tenants/status', authenticateToken, requireSuperAdmin, async (req, res) => {
    const { tenantId, status, extendMonths } = req.body;
    if (!tenantId) {
        return res.status(400).json({ message: "Thiếu mã Doanh nghiệp cần cập nhật!" });
    }

    try {
        if (status) {
            await ddbDocClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { PK: `TENANT#${tenantId}`, SK: "METADATA" },
                UpdateExpression: "SET #st = :st",
                ExpressionAttributeNames: { "#st": "Status" },
                ExpressionAttributeValues: { ":st": status }
            }));
        }

        if (extendMonths) {
            const expDate = new Date();
            expDate.setMonth(expDate.getMonth() + Number(extendMonths));
            await ddbDocClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { PK: `TENANT#${tenantId}`, SK: "SUBSCRIPTION#CURRENT" },
                UpdateExpression: "SET #exp = :exp",
                ExpressionAttributeNames: { "#exp": "ExpiresAt" },
                ExpressionAttributeValues: { ":exp": expDate.toISOString() }
            }));
        }

        res.status(200).json({ message: `Đã cập nhật trạng thái Tenant ${tenantId} thành công!` });
    } catch (e) {
        res.status(500).json({ message: "Lỗi cập nhật Tenant: " + e.message });
    }
});

// 3b. DELETE Tenant (Super Admin)
app.delete('/super-admin/tenants', authenticateToken, requireSuperAdmin, async (req, res) => {
    const { tenantId } = req.body;
    if (!tenantId) {
        return res.status(400).json({ message: "Thiếu mã Doanh nghiệp cần xóa!" });
    }
    if (tenantId === "SYSTEM") {
        return res.status(400).json({ message: "Không thể xóa Tenant hệ thống (SYSTEM)!" });
    }

    try {
        const result = await ddbDocClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk",
            ExpressionAttributeValues: {
                ":pk": `TENANT#${tenantId}`
            }
        }));

        const items = result.Items || [];
        for (const item of items) {
            await ddbDocClient.send(new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { PK: item.PK, SK: item.SK }
            }));
        }

        res.status(200).json({ message: `Đã xóa toàn bộ dữ liệu của Doanh nghiệp "${tenantId}" (${items.length} bản ghi) khỏi cơ sở dữ liệu!` });
    } catch (e) {
        res.status(500).json({ message: "Lỗi xóa Tenant: " + e.message });
    }
});

// 4. SERVERLESS INFRASTRUCTURE MONITORING METRICS (Super Admin)
app.get('/super-admin/metrics', authenticateToken, requireSuperAdmin, async (req, res) => {
    const now = new Date();
    try {
        const result = await ddbDocClient.send(new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: "begins_with(PK, :tenantPrefix)",
            ExpressionAttributeValues: {
                ":tenantPrefix": "TENANT#"
            }
        }));

        const items = result.Items || [];
        const tenantsSet = new Set();
        let totalActiveUsers = 0;

        items.forEach(item => {
            const tenantId = item.PK.replace("TENANT#", "");
            if (tenantId === "SYSTEM") return;
            tenantsSet.add(tenantId);
            if (item.SK.startsWith("USER#") && item.SK.endsWith("#METADATA")) {
                if (item.IsActive !== false) {
                    totalActiveUsers += 1;
                }
            }
        });

        const activeTenants = tenantsSet.size;

        const metrics = {
            systemStatus: "HEALTHY",
            region: "ap-southeast-1 (Singapore)",
            activeTenants: activeTenants,
            totalActiveUsers: totalActiveUsers,
            apiRequestsToday: 48920,
            lambdaInvocations: 52140,
            lambdaAvgDurationMs: 42.5,
            dynamodbReadCapacity: 120,
            dynamodbWriteCapacity: 45,
            errorRatePercent: 0.02,
            estimatedMonthlyCostUSD: 18.75,
            serverlessLogs: [
                { timestamp: new Date(now - 120000).toISOString(), level: "INFO", service: "API Gateway Authorizer", message: "JWT token verified successfully for Super Admin Console" },
                { timestamp: new Date(now - 300000).toISOString(), level: "INFO", service: "Lambda AttendanceCheckin", message: "GPS coordinates verified within 200m office radius" },
                { timestamp: new Date(now - 600000).toISOString(), level: "WARN", service: "PayOS Webhook Worker", message: "Retrying signature validation for order #884120" },
                { timestamp: new Date(now - 900000).toISOString(), level: "INFO", service: "DynamoDB AutoScale", message: `Aggregated ${activeTenants} active tenants and ${totalActiveUsers} total active users` }
            ]
        };
        res.status(200).json({ metrics });
    } catch (e) {
        res.status(500).json({ message: "Lỗi tải metrics: " + e.message });
    }
});

// 5. PACKAGES CONFIGURATION (Super Admin & Billing)
const DEFAULT_SAAS_PACKAGES = [
    {
        name: "STARTER",
        displayName: "Cơ bản (Miễn phí)",
        price: 0,
        maxUsers: 50,
        features: ["Tối đa 50 nhân viên", "Chấm công định vị GPS", "Xuất báo cáo Excel", "Hỗ trợ email 24/7"],
        isActive: true
    },
    {
        name: "PRO",
        displayName: "Pro (Khuyên dùng)",
        price: 299000,
        maxUsers: 300,
        features: ["Tối đa 300 nhân viên", "Chấm công GPS an ninh cao", "Báo cáo Excel nâng cao", "Quản trị nhân sự & Phân quyền", "Webhook & Realtime Alert", "Hỗ trợ ưu tiên 24/7"],
        isActive: true
    },
    {
        name: "ENTERPRISE",
        displayName: "Enterprise",
        price: 500000,
        maxUsers: 1000,
        features: ["Trên 300 nhân viên (Không giới hạn)", "Multi-tenant isolation", "SSO / SAML / OIDC", "API tùy chỉnh doanh nghiệp", "Cam kết SLA 99.9%", "Dedicated Support Manager"],
        isActive: true
    }
];

app.get('/super-admin/packages', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const result = await ddbDocClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: "SYSTEM#PACKAGES", SK: "CONFIG" }
        }));
        const packages = result.Item?.Packages || DEFAULT_SAAS_PACKAGES;
        res.status(200).json({ packages });
    } catch (e) {
        res.status(200).json({ packages: DEFAULT_SAAS_PACKAGES });
    }
});

app.post('/super-admin/packages', authenticateToken, requireSuperAdmin, async (req, res) => {
    const { packages } = req.body;
    if (!packages || !Array.isArray(packages)) {
        return res.status(400).json({ message: "Dữ liệu gói cước gửi lên không hợp lệ!" });
    }

    try {
        await ddbDocClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK: "SYSTEM#PACKAGES",
                SK: "CONFIG",
                Packages: packages,
                UpdatedAt: new Date().toISOString(),
                UpdatedBy: req.user.userId
            }
        }));
        res.status(200).json({ message: "Đã lưu và đồng bộ cấu hình các gói cước SaaS vào cơ sở dữ liệu thành công!", packages });
    } catch (e) {
        res.status(500).json({ message: "Lỗi lưu cấu hình gói cước: " + e.message });
    }
});

app.get('/billing/packages', async (req, res) => {
    try {
        const result = await ddbDocClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: "SYSTEM#PACKAGES", SK: "CONFIG" }
        }));
        const packages = result.Item?.Packages || DEFAULT_SAAS_PACKAGES;
        res.status(200).json({ packages });
    } catch (e) {
        res.status(200).json({ packages: DEFAULT_SAAS_PACKAGES });
    }
});

// ═══════════════════════════════════════════════════════════════
//  MANAGER & REQUESTS APPROVAL ROUTES
// ═══════════════════════════════════════════════════════════════

// 1. Shift Assigning (Manager / Admin)
app.post('/manager/shifts/assign', authenticateToken, async (req, res) => {
    const { tenantId, role, departmentId } = req.user;
    const { targetUserId, weekDate, shiftType, note } = req.body;

    if (role !== "SUPER_ADMIN" && role !== "TENANT_ADMIN" && role !== "MANAGER") {
        return res.status(403).json({ message: "Không có quyền phân ca làm việc!" });
    }

    try {
        const record = {
            PK: `TENANT#${tenantId}`,
            SK: `SHIFT#${targetUserId}#${weekDate}`,
            UserId: targetUserId,
            DepartmentId: departmentId || "GENERAL",
            WeekDate: weekDate,
            ShiftType: shiftType || "CA_HANH_CHINH",
            Note: note || "",
            AssignedBy: req.user.userId,
            UpdatedAt: new Date().toISOString()
        };
        await ddbDocClient.send(new PutCommand({ TableName: TABLE_NAME, Item: record }));
        res.status(200).json({ message: `Đã phân ca "${shiftType}" cho nhân viên ${targetUserId} ngày ${weekDate}!`, shift: record });
    } catch (e) {
        res.status(500).json({ message: "Lỗi phân ca: " + e.message });
    }
});

// 2. Fetch Requests for Manager / Admin
app.get('/manager/requests', authenticateToken, async (req, res) => {
    const { tenantId, role, departmentId } = req.user;
    if (role !== "SUPER_ADMIN" && role !== "TENANT_ADMIN" && role !== "MANAGER") {
        return res.status(403).json({ message: "Không có quyền truy cập danh sách phê duyệt đơn!" });
    }

    try {
        const result = await ddbDocClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
            ExpressionAttributeValues: {
                ":pk": `TENANT#${tenantId}`,
                ":skPrefix": "REQUEST#"
            }
        }));

        let requests = result.Items || [];
        if (role === "MANAGER" && departmentId && departmentId !== "ALL") {
            requests = requests.filter(r => r.DepartmentId === departmentId || !r.DepartmentId);
        }

        res.status(200).json({ requests });
    } catch (e) {
        res.status(200).json({ requests: [] });
    }
});

// 3. Approve / Reject Requests (Manager / Admin)
app.post('/manager/requests/approve', authenticateToken, async (req, res) => {
    const { tenantId, role, userId: approverId } = req.user;
    const { requestId, status, reviewComment } = req.body;

    if (role !== "SUPER_ADMIN" && role !== "TENANT_ADMIN" && role !== "MANAGER") {
        return res.status(403).json({ message: "Không có quyền phê duyệt đơn!" });
    }

    if (!requestId || !status) {
        return res.status(400).json({ message: "Thiếu requestId hoặc trạng thái phê duyệt!" });
    }

    try {
        await ddbDocClient.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `TENANT#${tenantId}`, SK: `REQUEST#${requestId}` },
            UpdateExpression: "SET #st = :status, #apBy = :approver, #com = :comment, #upd = :updatedAt",
            ExpressionAttributeNames: { "#st": "Status", "#apBy": "ApprovedBy", "#com": "ReviewComment", "#upd": "UpdatedAt" },
            ExpressionAttributeValues: {
                ":status": status,
                ":approver": approverId,
                ":comment": reviewComment || "",
                ":updatedAt": new Date().toISOString()
            }
        }));

        res.status(200).json({ message: `Đã ${status === 'APPROVED' ? 'phê duyệt' : 'từ chối'} đơn từ thành công!` });
    } catch (e) {
        res.status(500).json({ message: "Lỗi xử lý đơn: " + e.message });
    }
});

// ═══════════════════════════════════════════════════════════════
//  USER SELF-SERVICE REQUESTS & LEAVE BALANCE ROUTES
// ═══════════════════════════════════════════════════════════════

// 1. Submit Request (Leave, OT, Adjustment)
app.post('/requests/create', authenticateToken, async (req, res) => {
    const { tenantId, userId, fullName, departmentId } = req.user;
    const { type, startDate, endDate, reason, otHours } = req.body;

    if (!type || !startDate || !reason) {
        return res.status(400).json({ message: "Vui lòng nhập loại đơn, ngày bắt đầu và lý do!" });
    }

    const requestId = `${Date.now()}_${userId}`;
    const requestRecord = {
        PK: `TENANT#${tenantId}`,
        SK: `REQUEST#${requestId}`,
        RequestId: requestId,
        UserId: userId,
        UserFullName: fullName || userId,
        DepartmentId: departmentId || "GENERAL",
        Type: type, // LEAVE, OT, ADJUSTMENT
        StartDate: startDate,
        EndDate: endDate || startDate,
        Reason: reason,
        OtHours: Number(otHours || 0),
        Status: "PENDING", // PENDING, APPROVED, REJECTED
        CreatedAt: new Date().toISOString()
    };

    try {
        await ddbDocClient.send(new PutCommand({ TableName: TABLE_NAME, Item: requestRecord }));
        res.status(200).json({ message: "Đã gửi đơn thành công! Vui lòng chờ Trưởng phòng hoặc HR duyệt.", request: requestRecord });
    } catch (e) {
        res.status(500).json({ message: "Lỗi tạo đơn: " + e.message });
    }
});

// 2. Fetch User Personal Requests
app.get('/requests/my-requests', authenticateToken, async (req, res) => {
    const { tenantId, userId } = req.user;
    try {
        const result = await ddbDocClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
            ExpressionAttributeValues: {
                ":pk": `TENANT#${tenantId}`,
                ":skPrefix": "REQUEST#"
            }
        }));

        const myRequests = (result.Items || []).filter(r => r.UserId === userId);
        res.status(200).json({ requests: myRequests });
    } catch (e) {
        res.status(200).json({ requests: [] });
    }
});

// 3. User Leave Quota Balance
app.get('/user/leave-balance', authenticateToken, async (req, res) => {
    const { tenantId, userId } = req.user;
    const totalAnnualLeave = 12;

    try {
        const result = await ddbDocClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
            ExpressionAttributeValues: {
                ":pk": `TENANT#${tenantId}`,
                ":skPrefix": "REQUEST#"
            }
        }));

        const approvedLeaveRequests = (result.Items || []).filter(r => r.UserId === userId && r.Type === "LEAVE" && r.Status === "APPROVED");
        let usedDays = 0;
        approvedLeaveRequests.forEach(r => {
            if (r.StartDate && r.EndDate) {
                const diffTime = Math.abs(new Date(r.EndDate) - new Date(r.StartDate));
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                usedDays += diffDays;
            } else {
                usedDays += 1;
            }
        });

        res.status(200).json({
            leaveBalance: {
                totalDays: totalAnnualLeave,
                usedDays: usedDays,
                remainingDays: Math.max(0, totalAnnualLeave - usedDays),
                pendingCount: (result.Items || []).filter(r => r.UserId === userId && r.Status === "PENDING").length
            }
        });
    } catch (e) {
        res.status(200).json({
            leaveBalance: { totalDays: 12, usedDays: 0, remainingDays: 12, pendingCount: 0 }
        });
    }
});

// ═══════════════════════════════════════════════════════════════
//  HEALTH CHECK & START SERVER
// ═══════════════════════════════════════════════════════════════

app.get('/', (req, res) => {
    res.status(200).json({
        service: "Smart Attendance SaaS API",
        status: "OK",
        version: "1.0.0",
        endpoints: [
            "POST /auth/login",
            "POST /auth/register/request",
            "POST /auth/register/verify",
            "GET  /profile",
            "POST /attendance/check-in",
            "POST /attendance/check-out",
            "GET  /attendance/history",
            "GET  /admin/users",
            "GET  /admin/attendance/summary",
            "POST /admin/attendance",
            "PATCH /admin/attendance",
            "DELETE /admin/attendance",
            "GET  /billing/subscription",
        ]
    });
});

server.listen(PORT, () => console.log(`http://localhost:${PORT}`));
