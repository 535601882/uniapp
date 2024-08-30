// redis.js
const redis = require('redis');

// 创建Redis客户端实例
const client = redis.createClient({
  host: 'localhost',
  port: 6379,
  // 可以添加其他配置，如password, db等
});

// 监听错误事件
client.on('error', (err) => {
  console.error('Redis Client Error', err);
});
// 监听连接
client.on('connect', () => {
  console.log('Redis is connected');
});

// 当进程关闭时，关闭Redis客户端连接
process.on('exit', () => {
  console.log('关闭Redis客户端连接...');
  client.quit();
});

// 导出Redis客户端实例
module.exports = client
