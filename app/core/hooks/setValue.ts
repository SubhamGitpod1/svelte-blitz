import type {Writable} from "svelte/store"
import {getContext} from "svelte-typed-context"
import FormData, {type FormDataType} from "app/core/symbols/formData"

export default function setValue(Value: Writable<string | number | FormDataType | null>, key: string) {
    const formData = getContext(FormData)
    Value.subscribe(value => {
        if(value == null) return formData?.update(formData => {
            delete formData[key]
            return formData
        })
        console.log(key, value)

        formData?.update(formData => ({
            ...formData,
            [key]: value
        }))
    })
    formData?.subscribe(formData => {
        Value.set(formData[key] as string | number | FormDataType)
    })
}

export function setValueIfChecked(value: string | number | FormDataType, key: string, Checked: Writable<boolean>) {
    const formData = getContext(FormData)
    Checked.subscribe(checked => {
        formData?.update(formData => {
            if(checked) return {
                ...formData,
                [key]: value
            }
            if(formData[key] === value) delete formData[key]
            return formData
        })
    })
    formData?.subscribe(formData => {
        Checked.set(formData[key] != value)
    })
}

export function setValueForCheckBox(value: string | number | FormDataType, key: string, Checked: Writable<boolean>) {
    const formData = getContext(FormData)
    Checked.subscribe(checked => {
        formData?.update(formData => {
            if(!Array.isArray(formData[key])) formData[key] = []
            if(checked) return {
                ...formData,
                [key]: [
                    ...(
                        Array.isArray(formData[key]) 
                        ? formData[key] as (string[] | number[]) 
                        : []
                    ),
                    value
                ].reduce(
                    (values, value) => (values.includes(value as never) ? values : [...values, value]) as string[] | number[], 
                    [] as string[] | number[]
                )
            }
            return {
                ...formData,
                [key]: (formData[key] as Array<string | number>).filter(Value => Value !== value) as string[] | number[]
            }
        })
    })
    formData?.subscribe(formData => {
        if(!Array.isArray(formData[key])) formData[key] = []
        if((formData[key] as string[] | number[]).includes(value as never)) return Checked.set(true)
        Checked.set(false)
    })
}
