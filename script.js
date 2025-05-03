const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
    secret: 'jaldiaaojaldikamao_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Database simulation
let users = [
    {
        id: 1,
        name: "Admin User",
        email: "admin@jaldiaaojaldikamao.com",
        phone: "03481866809",
        password: "admin123",
        balance: 0,
        totalInvested: 0,
        totalEarned: 0,
        referralEarnings: 0,
        referralCode: "ADMIN123",
        isAdmin: true,
        investments: [],
        transactions: []
    }
];

let investments = [];
let withdrawals = [];
let transactions = [];

// Packages data
const packages = [
    { id: 1, name: "Basic", investment: 1000, profit: 2000, duration: 30, dailyEarning: 66.67 },
    { id: 2, name: "Starter", investment: 2000, profit: 4000, duration: 30, dailyEarning: 133.33 },
    { id: 3, name: "Standard", investment: 3000, profit: 6000, duration: 30, dailyEarning: 200 },
    { id: 4, name: "Premium", investment: 5000, profit: 10000, duration: 30, dailyEarning: 333.33 },
    { id: 5, name: "Advanced", investment: 7000, profit: 14000, duration: 40, dailyEarning: 350 },
    { id: 6, name: "Professional", investment: 10000, profit: 22000, duration: 35, dailyEarning: 628.57 }
];

// API Routes
app.get('/api/packages', (req, res) => {
    res.json(packages);
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        req.session.user = user;
        res.json({ success: true, user });
    } else {
        res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
});

app.post('/api/signup', (req, res) => {
    const { name, email, phone, password, referral } = req.body;
    
    if (users.some(u => u.email === email)) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    
    const referralCode = 'JAJK' + Math.floor(1000 + Math.random() * 9000);
    const newUser = {
        id: users.length + 1,
        name,
        email,
        phone,
        password,
        balance: 0,
        totalInvested: 0,
        totalEarned: 0,
        referralEarnings: 0,
        referralCode,
        isAdmin: false,
        investments: [],
        transactions: []
    };
    
    users.push(newUser);
    
    // Process referral if exists
    if (referral) {
        const referrer = users.find(u => u.referralCode === referral);
        if (referrer) {
            // Give referrer some bonus
            referrer.referralEarnings += 100;
            referrer.balance += 100;
        }
    }
    
    req.session.user = newUser;
    res.json({ success: true, user: newUser });
});

app.post('/api/invest', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const { packageId, transactionId, paymentMethod } = req.body;
    const packageData = packages.find(p => p.id === packageId);
    
    if (!packageData) {
        return res.status(400).json({ success: false, message: 'Invalid package' });
    }
    
    const investment = {
        id: investments.length + 1,
        userId: req.session.user.id,
        packageId: packageData.id,
        amount: packageData.investment,
        startDate: new Date(),
        endDate: new Date(new Date().setDate(new Date().getDate() + packageData.duration)),
        status: 'pending',
        transactionId,
        paymentMethod
    };
    
    investments.push(investment);
    
    // Create transaction
    const transaction = {
        id: transactions.length + 1,
        userId: req.session.user.id,
        type: 'deposit',
        amount: packageData.investment,
        date: new Date(),
        status: 'pending',
        details: `Investment in ${packageData.name} package`
    };
    
    transactions.push(transaction);
    
    // Update user
    const user = users.find(u => u.id === req.session.user.id);
    user.transactions.push(transaction);
    
    res.json({ success: true, investment });
});

app.post('/api/withdraw', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const { amount, method, account } = req.body;
    
    if (amount < 250) {
        return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is ₨250' });
    }
    
    const user = users.find(u => u.id === req.session.user.id);
    
    if (amount > user.balance) {
        return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }
    
    // Create withdrawal
    const withdrawal = {
        id: withdrawals.length + 1,
        userId: user.id,
        amount,
        method,
        account,
        date: new Date(),
        status: 'pending'
    };
    
    withdrawals.push(withdrawal);
    
    // Create transaction
    const transaction = {
        id: transactions.length + 1,
        userId: user.id,
        type: 'withdrawal',
        amount: -amount,
        date: new Date(),
        status: 'pending',
        details: `Withdrawal request via ${method}`
    };
    
    transactions.push(transaction);
    user.transactions.push(transaction);
    user.balance -= amount;
    
    res.json({ success: true, withdrawal });
});

app.get('/api/user', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const user = users.find(u => u.id === req.session.user.id);
    res.json({ success: true, user });
});

app.get('/api/transactions', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const userTransactions = transactions.filter(t => t.userId === req.session.user.id);
    res.json({ success: true, transactions: userTransactions });
});

app.get('/api/investments', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const userInvestments = investments.filter(i => i.userId === req.session.user.id);
    res.json({ success: true, investments: userInvestments });
});

// Admin routes
app.get('/api/admin/users', (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    
    res.json({ success: true, users: users.filter(u => !u.isAdmin) });
});

app.get('/api/admin/investments', (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    
    res.json({ success: true, investments });
});

app.get('/api/admin/withdrawals', (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    
    res.json({ success: true, withdrawals });
});

app.get('/api/admin/transactions', (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    
    res.json({ success: true, transactions });
});

app.post('/api/admin/approve', (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    
    const { type, id } = req.body;
    
    if (type === 'investment') {
        const investment = investments.find(i => i.id === id);
        if (investment) {
            investment.status = 'approved';
            
            // Update transaction status
            const transaction = transactions.find(t => 
                t.userId === investment.userId && 
                t.amount === investment.amount && 
                t.details.includes(investment.packageId)
            );
            
            if (transaction) {
                transaction.status = 'approved';
            }
            
            // Update user's investment
            const user = users.find(u => u.id === investment.userId);
            if (user) {
                user.investments.push(investment);
                user.totalInvested += investment.amount;
                
                // Add daily earnings transaction
                const packageData = packages.find(p => p.id === investment.packageId);
                const earningTransaction = {
                    id: transactions.length + 1,
                    userId: user.id,
                    type: 'earning',
                    amount: packageData.dailyEarning,
                    date: new Date(),
                    status: 'approved',
                    details: `Daily earnings from ${packageData.name} package`
                };
                
                transactions.push(earningTransaction);
                user.transactions.push(earningTransaction);
                user.totalEarned += packageData.dailyEarning;
                user.balance += packageData.dailyEarning;
            }
            
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Investment not found' });
        }
    } else if (type === 'withdrawal') {
        const withdrawal = withdrawals.find(w => w.id === id);
        if (withdrawal) {
            withdrawal.status = 'approved';
            
            // Update transaction status
            const transaction = transactions.find(t => 
                t.userId === withdrawal.userId && 
                t.amount === -withdrawal.amount && 
                t.details.includes(withdrawal.method)
            );
            
            if (transaction) {
                transaction.status = 'approved';
            }
            
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Withdrawal not found' });
        }
    } else {
        res.status(400).json({ success: false, message: 'Invalid type' });
    }
});

app.post('/api/admin/reject', (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    
    const { type, id } = req.body;
    
    if (type === 'investment') {
        const investment = investments.find(i => i.id === id);
        if (investment) {
            investment.status = 'rejected';
            
            // Update transaction status
            const transaction = transactions.find(t => 
                t.userId === investment.userId && 
                t.amount === investment.amount && 
                t.details.includes(investment.packageId)
            );
            
            if (transaction) {
                transaction.status = 'rejected';
            }
            
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Investment not found' });
        }
    } else if (type === 'withdrawal') {
        const withdrawal = withdrawals.find(w => w.id === id);
        if (withdrawal) {
            withdrawal.status = 'rejected';
            
            // Update transaction status
            const transaction = transactions.find(t => 
                t.userId === withdrawal.userId && 
                t.amount === -withdrawal.amount && 
                t.details.includes(withdrawal.method)
            );
            
            if (transaction) {
                transaction.status = 'rejected';
            }
            
            // Return funds to user
            const user = users.find(u => u.id === withdrawal.userId);
            if (user) {
                user.balance += withdrawal.amount;
            }
            
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Withdrawal not found' });
        }
    } else {
        res.status(400).json({ success: false, message: 'Invalid type' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

