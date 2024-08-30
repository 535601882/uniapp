<script>
	import {request} from "./utils/request"
	export default {
		//全局变量
		globalData: {},
		onLaunch: function() {
			console.log('App Launch',import.meta.env)
			this.checkLoginStatus();
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		},
		methods: {
			checkLoginStatus() {
				const token = uni.getStorageSync('token');

				if (token) {
					// 检查token是否过期，可以根据你的业务逻辑来决定
					// 如果有效，直接进入主界面
					this.getUserInfo(token);
				} else {
					// 没有token，执行静默登录
					this.silentLogin();
				}
			},
			silentLogin() {
				uni.login({
					provider: 'weixin', //使用微信登录
					success: function (loginRes) {
						let {code} = loginRes
						if (code) {
							request({
								url: import.meta.env.VITE_API_URL+'/login',
								method: "GET",
								data: {code},
								success(res) {
									if (res.token) {
									  uni.setStorageSync('token', res.data.token);
									  this.getUserInfo();
									} else {
									  console.error('登录失败', res.data.message);
									}
								},
								fail(e){
									console.log(e)
								}
							})
						  // 调用后端接口，用code获取token
						} else {
						  console.error('获取登录凭证失败', loginRes.errMsg);
						}
					}
				});
			},

			getUserInfo() {
				// 在这里加载用户信息或进行后续操作
				request({
					url: import.meta.env.VITE_API_URL+'/userInfo', // 替换为你的后端获取用户信息的接口
					method: 'GET',
					success: (res) => {
						console.log('用户信息:', res.data);
						// 将用户信息存储或处理
					}
				});
			}
		}
	}
</script>

<style>
	/*每个页面公共css */
</style>
