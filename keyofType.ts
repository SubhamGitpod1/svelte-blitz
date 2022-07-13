type keyofType<T extends Object, Type> = {
    [Key in keyof T]: T[Key] extends Type ? Key : never
}[keyof T]

export default keyofType