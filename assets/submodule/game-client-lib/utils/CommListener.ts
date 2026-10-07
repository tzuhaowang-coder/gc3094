export default interface CommListener<T> {
    onMessage(obj: T, opts?:{ isManualOperation: boolean, [s:string]:any});
}
