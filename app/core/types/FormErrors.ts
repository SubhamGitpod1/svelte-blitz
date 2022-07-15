type FormErrors<T extends object> = {
    [key in keyof T]?: T[key] extends object ? FormErrors<T[key]> : {
        _errors?: string[]
    }
} & {
    _errors?: string[]
}

export default FormErrors