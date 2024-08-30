const axios = require('axios');
const instance = axios.create({
  timeout: 20 * 1000 // 请求超时时间
});

// 请求拦截器
instance.interceptors.request.use(
  config => {
    // 在这里可以添加一些请求前的处理逻辑
    // 比如添加认证头
    return config;
  },
  error => {
    // 对请求错误做些什么
    return Promise.reject(error);
  }
);

// 响应拦截器
instance.interceptors.response.use(
  response => {
    // 对响应数据做点什么
    return response.data; // 直接返回响应数据
  },
  error => {
    // 对响应错误做点什么
    return Promise.reject(error);
  }
);

module.exports = instance
