let isRefreshing = false;
let requests = [];
let activeRequests = 0;

function request(options) {
  return new Promise((resolve, reject) => {
    if (activeRequests === 0) {
      // 显示loading，只在第一个请求时显示
      uni.showLoading({
        title: '加载中'
      });
    }
    activeRequests += 1;

    // 获取token
    const token = uni.getStorageSync('token');
    const refreshToken = uni.getStorageSync('refreshToken');

    // 设置请求头
    options.header = {
      ...options.header,
      'Authorization': `Bearer ${token}`
    };

    // 发起请求
    uni.request({
      ...options,
      success: (response) => {
        const { data, statusCode } = response;

        if (statusCode === 401) {
          if (!isRefreshing) {
            isRefreshing = true;

            refreshTokenRequest(refreshToken).then(newToken => {
              uni.setStorageSync('token', newToken);
              options.header['Authorization'] = `Bearer ${newToken}`;

              requests.forEach(cb => cb(newToken));
              requests = [];
              isRefreshing = false;

              request(options).then(resolve).catch(reject);
            }).catch(() => {
              uni.removeStorageSync('token');
              uni.removeStorageSync('refreshToken');
              uni.redirectTo({
                url: '/pages/login/login'
              });
            });
          } else {
            requests.push((newToken) => {
              options.header['Authorization'] = `Bearer ${newToken}`;
              request(options).then(resolve).catch(reject);
            });
          }
        } else {
          resolve(data);
        }
      },
      fail: (error) => {
        reject(error);
      },
      complete: () => {
        activeRequests -= 1;
        if (activeRequests === 0) {
          // 关闭loading，只在最后一个请求结束时关闭
          uni.hideLoading();
        }
      }
    });
  });
}
// 利用refreshToken重新获取token
function refreshTokenRequest(refreshToken) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: import.meta.env.VITE_API_URL+'/refresh_token',
      method: 'POST',
      data: {
        refreshToken
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.token) {
          resolve(res.data.token);
        } else {
          reject();
        }
      },
      fail: () => {
        reject();
      }
    });
  });
}

export default request;
