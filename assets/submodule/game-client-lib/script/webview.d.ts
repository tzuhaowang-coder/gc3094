declare let APP: boolean;

declare namespace webview {
    /**
     * for test
     */
    export function echo(str: string): string;

    /**
     * 被踢
     * 在遊戲，可能要回大廳
     * 在大廳，可能要重連
     */
    export function gameKick(gid: string, code: number, msg: string): void;

    /**
     * 發生錯誤
     * 有哪些需要處理?
     */
    export function gameError(gid: string, msg: string): void;

    /**
     * 未知錯誤
     */
    export function unknownError(gid: string, msg:string): void;

}
