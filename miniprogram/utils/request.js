export function request(options) {
  return new Promise((resolve, reject) => {
    // 从本地存储获取 token
    const token = uni.getStorageSync('token');
    
    // 设置请求头
    const headers = {
      'Content-Type': 'application/json',
      ...options.header,
    };

    if (token) {
      headers['Authorization'] = `${token}`;
    }

    // 发起请求
    uni.request({
      ...options,
      header: headers,
      success: (response) => {
        const { data } = response;
        if (data.code === 401) {
          // 处理 token 过期的情况
          handleTokenExpired();
          reject('Token expired');
        } else if (data.code !== 200) {
          // 处理其他请求失败的情况
          uni.showToast({
            title: data.message || '请求失败',
            icon: 'none'
          });
          reject(data.message);
        } else {
          resolve(data);
        }
      },
      fail: (error) => {
        uni.showToast({
          title: '请求失败',
          icon: 'none'
        });
        reject(error);
      }
    });
  });
}

function handleTokenExpired() {
  uni.showToast({
    title: '登录已过期，请重新登录',
    icon: 'none'
  });
  // 清除本地存储中的 token
  uni.removeStorageSync('token');
  // 这里可以跳转到登录页或者重新发起登录请求
  // uni.redirectTo({
  //   url: '/pages/login/login'
  // });
}