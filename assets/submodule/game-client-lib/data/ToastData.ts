// 訊息提示內容
export default class ToastData {

    constructor(
        // 提示時間
        public msg: string,
        // 提示內容
        public time: number,
        // 忽略重複
        public skipRepeat: boolean) {
    }
}
