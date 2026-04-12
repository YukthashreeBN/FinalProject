const roleMiddleware = (role) => {
    return (req, res, next) => {
        const allowed = Array.isArray(role) ? role : [role];
        if (!allowed.includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied" });
        }
        next();
    };
};

module.exports = roleMiddleware;