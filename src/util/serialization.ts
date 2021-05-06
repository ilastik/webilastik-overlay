export interface IJsonable{
    toJsonValue(): Jsonable
}

export interface IJsonableObject{
    [key: string]: Jsonable
}

export type Jsonable = number | string | null | IJsonable | Array<Jsonable> | IJsonableObject

export function toJsonValue(value: Jsonable) : Jsonable{
    if(typeof value == "number" || typeof value == "string" || value === null){
        return value
    }
    if(value instanceof Array){
        return value.map(val => toJsonValue(val))
    }
    if(!("toJsonValue" in value)){
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
