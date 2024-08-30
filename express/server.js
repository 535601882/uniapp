const path = require("path")
const express = require('express')
const cors = require('cors');
const app = express()
const client = require("./utils/redis")
const bodyParser = require('body-parser')
const axios = require("./axios")
require('dotenv').config()
// 导入用户将客户端发送过来的 JWT 字符串，解析还原成 JSON 对象的包
const {expressjwt: expressJWT} = require('express-jwt')
// 导入用于生成 JWT 字符串的包
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid');

const token_expires_in = 7200//2h
const refreshToken_expires_in = 14400//4 hour
// 白名单
const whitePath = ['/login']

client.connect(); // 连接到Redis服务器
// 使用 CORS 中间件，允许所有来源的跨域请求
app.use(cors());

app.use(express.static(__dirname + '../public'));
app.use('/uploads', express.static('uploads'));

// 接收post Json
app.use(bodyParser.json())
// 接收URL-encoded格式的数据
app.use(bodyParser.urlencoded({
  extended: false
}));

app.use((req, res, next) => {
  const { headers, method, originalUrl, query, body } = req;
  const headersParameters = JSON.stringify(headers);
  const queryParameters = JSON.stringify(query);
  const queryBody = JSON.stringify(body);
  // 在请求开始时记录基本信息
  console.info(`Request received - Method: ${method}, URL: ${originalUrl},Header Parameters: ${headersParameters}, Query Parameters: ${queryParameters},Body Parameters: ${queryBody}`);

  // 响应结束后记录响应状态码
  res.on('finish', () => {
    console.info(`Response sent - Status Code: ${res.statusCode}`);
  });

  next(); // 调用下一个中间件或路由处理器
});

// JWT验证中间件仅应用于需要保护的路由
const protectedRoutes = express.Router();

// 默认情况下它是期望在Authorization头中找到带有Bearer前缀的token
protectedRoutes.use(expressJWT({
  secret: process.env.SECRETKEY,// 密钥
  algorithms: ['HS256'],
  requestProperty: 'auth',//请求对象中设置有效负载的属性名称。默认为 req.auth
  //通过 getToken 也可以自定义一些解析逻辑，比如使用其他 Header 字段，自定义抛出异常等
  getToken: function fromHeaderOrQuerystring(req) {
    let authorization = null
    if (
      req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Bearer"
    ) {
      authorization = req.headers.authorization.split(" ")[1];
    } else if (req.headers.authorization) {
      authorization = req.headers.authorization;
    }
    // 校验是否在黑名单
    return authorization;
  },
  // 用于验证令牌是否被吊销的函数
  isRevoked: async function (req, token) {
    const tokenId = token.payload.jti;
    const status = await client.get(tokenId);
    return status !== null;
  }
}).unless({ path: whitePath }))// 白名单 path可以是字符串、正则表达式或其中任意一个的数组

// 小程序静默登录
app.get("/login", (req, res) => {
	const {code} = req.query
	if(!code) return res.json({message: "code 不能为空"})
	console.log(process.env.APPID,process.env.SECRET)
	let params = {
			appid: process.env.APPID,
			secret: process.env.SECRET,
			js_code: code,
			grant_type: "authorization_code"
		}
	axios.get("https://api.weixin.qq.com/sns/jscode2session",{
		params
	}).then(async data => {
			console.log("data",	data,params);
			if(process.env.ISMOCK) {
				// 返回假数据
				res.json({
						message: "登录成功",
						user: {
								openId: null,
								token: "111"
								// 返回其他必要的用户信息
								// 服务器生成一个token
						}
				});
			}
			const { openid, session_key } = data;
			if (!openid) return res.status(400).json({ code: '201',message: "获取 openId 失败" });
			 // 查找用户 todo
			let user = null;

			if (!user) {
					/**
					 * 1.第一种情况
					 * 如果没有找到用户，进行注册
					 */
					// user = new User({
					// 		openId: openid,
					// 		sessionKey: session_key,
					// 		// 其他用户初始信息，如注册时间、昵称等
					// });
					// await user.save();
					// console.log('新用户注册成功');
					
				 /**
					* 2.第二种情况
					* 如果用户未绑定，引导用户绑定手机号
					*/ 
					return res.json({
						code: 500,
						message: "用户未绑定，请输入手机号进行绑定",
						needBind: true,
						openId: openid
					});
			} else {
				console.log('用户已存在，直接登录');
				// 登录成功
				// 在登录成功之后，调用 jwt.sign() 方法生成 JWT 字符串。并通过 token 属性发送给客户端
				let payload = { username: "测试",email: "11@qq.com" }
				const tokenStr = jwt.sign(
					{...payload,jti: uuidv4()},
					process.env.SECRETKEY,// 定义 secret 密钥
					{ expiresIn: token_expires_in }//例如： 60 ， "2 days" ， "10h" ， "7d" 。数值被解释为秒数。如果使用字符串，请确保提供时间单位（天、小时等），否则默认使用毫秒单位（ "120" 等于 "120ms" ）。
				)
				// 生成刷新token
				const refreshToken = jwt.sign({...payload,jti: uuidv4()}, process.env.SECRETKEY, { expiresIn: refreshToken_expires_in });

				// 返回用户信息给前端
				res.json({
					status: 200,
					message: "登录成功",
					token: tokenStr, // 要发送给客户端的 token 字符串
					refreshToken,
					expiresAt: Date.now() + (token_expires_in * 1000) // 过期时间 当前时间 + 30s
				});
			}
	})
})

// 绑定手机号的接口
app.post("/bindPhone", async (req, res) => {
    const { openId, phoneNumber } = req.body;

    if (!openId || !phoneNumber) return res.status(400).json({ message: "缺少 openId 或手机号" });

    // 在管理系统中查找用户
    const existingUser = null; // 这是一个伪函数，模拟查找管理系统用户

    if (!existingUser) {
        return res.status(404).json({ message: "手机号未在系统中注册" });
    }

    // 创建或更新用户信息
    let user = null;
    if (!user) {
        // 插入user数据
    } else {
        // 更新用户的手机号信息
    }

    res.json({
        message: "绑定成功",// 
        user: {
            openId: null,
            phoneNumber: null,
            // 返回其他用户信息
        }
    });
});

// 获取用户信息
protectedRoutes.get("/userInfo", (req, res) => {
	return res.json({
		name: "测试",
		age: 12
	})
})
// 刷新token
protectedRoutes.get("/refresh_token", (req, res) => {
	const refreshToken = req.body.refreshToken;
	jwt.verify(refreshToken, process.env.SECRETKEY, (err, decoded) => {
		if (err) {
			return res.status(401).send('Invalid refresh token');
		}

		const token = jwt.sign({ username: decoded.username,email: decoded.email,birthday: decoded.birthday,address: decoded.address,jti: uuidv4() }, process.env.SECRETKEY, { expiresIn: '30s' });
		res.json({ token });
	});
})



// 将受保护路由挂载到应用中
app.use('/api', protectedRoutes);
// Wrong path handler
app.all("*", (req, _, next) => {
	const err = new Error(`Path ${req.originalUrl} does not exist for ${req.method} method`);
	err.status = 404;
  next(err);
});
// 全局错误中间件
app.use(function (err, req, res, next) {
	// token
  if (err.name === "UnauthorizedError") {
    res.status(401).send("invalid token...");
  } else {
    next(err);
  }
});
const PORT = 3002;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});