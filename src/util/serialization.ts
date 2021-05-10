export interface IJsonable{
    toJsonValue(): Jsonable
}

export interface IJsonableObject{
    [key: string]: Jsonable
}

export type JsonLeaf = number | string | boolean | null

export type Jsonable = JsonLeaf | IJsonable | Array<Jsonable> | IJsonableObject

export function toJsonValue(value: Jsonable) : Jsonable{
    if(isLeaf(value)){
        return value
    }
    if(isArray(value)){
        return value.map(val => toJsonValue(val))
    }
    if(isObject(value)){
        let out : IJsonableObject = {}
        for(let key in value){
            out[key] = toJsonValue(value[key])
        }
        return out
    }
    return (value as IJsonable).toJsonValue()
}

export interface IDeserializer<STATE extends Jsonable>{
    (data: any): STATE;
}

export function isLeaf(value: Jsonable): value is JsonLeaf{
    return typeof value == "number" || typeof value == "string" || value === null
}

export function isArray(value: Jsonable): value is Array<Jsonable>{
    return value instanceof Array
}

export function isIJsonable(value: Jsonable): value is IJsonable{
    return value !== null && typeof(value) == "object" && "toJsonValue" in value
}

export function isObject(value: Jsonable): value is IJsonableObject{
    return typeof(value) == "object" && value != null && !isIJsonable(value)
}
