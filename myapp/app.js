const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// 异步函数来连接数据库
async function connectToDatabase() {
    try {
        const db = await mysql.createConnection({
            host: 'localhost',
            user: 'root', // 替换为您的MySQL用户名
            password: '111111', // 替换为您的MySQL密码
            database: 'user'
        });

        // 在这里，您可以将db对象附加到app对象上，或者将其存储在全局变量中
        // 但请注意，全局变量通常不是最佳实践
        app.locals.db = db; // 示例：将db附加到app.locals上，以便在请求处理程序中使用

        console.log('Database connected successfully');
    } catch (error) {
        console.error('Error connecting to database:', error);
        process.exit(1); // 退出程序，因为数据库连接失败
    }
}

// 调用连接数据库的函数
connectToDatabase();

app.use(cors());
app.use(bodyParser.json());

// 示例路由：获取所有用户
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await app.locals.db.execute('SELECT * FROM users');
        res.json(rows);
    } catch (error) {
        res.status(500).send('Error fetching users');
    }
});


// 添加新用户
app.post('/api/users', async (req, res) => {
    const { name, email } = req.body;
    try {
        const [results] = await app.locals.db.execute('INSERT INTO users (name, email) VALUES (?, ?)', [name, email]);
        res.status(201).send('User added successfully');
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).send('Email already exists');
        } else {
            res.status(500).send('Error adding user');
        }
    }
});


// 修改用户
app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params; // 从URL中获取用户ID
    const { name, email } = req.body; // 从请求体中获取新的name和email

    try {
        // 使用UPDATE语句更新用户信息
        // 注意：这里应该添加一个WHERE子句来确保只更新具有特定ID的用户
        const [results, fields] = await app.locals.db.execute(
            'UPDATE users SET name = ?, email = ? WHERE id = ?',
            [name, email, id]
        );

        // 检查是否成功更新了行
        if (results.affectedRows === 0) {
            // 如果没有行被更新（即没有找到具有该ID的用户），返回404
            res.status(404).send('User not found');
        } else {
            // 如果有行被更新，返回200或204（无内容）
            res.status(204).send('User updated successfully');
            // 或者如果你想要返回更新的用户信息，可以查询并返回它
            // 但通常PUT请求不期望在响应中包含整个资源表示
        }
    } catch (error) {
        // 处理可能的数据库错误
        if (error.code === 'ER_DUP_ENTRY' || error.message.includes('Duplicate entry')) {
            // 注意：ER_DUP_ENTRY通常用于INSERT时的重复键，但UPDATE时可能需要检查具体的错误消息
            res.status(400).send('Email already exists in the database');
        } else {
            res.status(500).send('Error updating user');
        }
    }
});


// 删除用户
app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;

    app.locals.db.execute('DELETE FROM users WHERE id = ?', [id], (err, results, fields) => {
        if (err) {
            res.status(500).send('Error deleting user');
        } else if (results.affectedRows === 0) {
            res.status(404).send('User not found');
        } else {
            res.status(204).send();
        }
    });
});



app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});