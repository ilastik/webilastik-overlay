import { vec3 } from "gl-matrix";
import { Session } from "../client/ilastik";
import { ParsedUrl } from "../util/parsed_url";

export interface IMultiscaleDataSource{
    readonly url: ParsedUrl;
    readonly scales: Array<IDataScale>;
    findScale(resolution: vec3): IDataScale | undefined;
}

export interface IDataScale{
    readonly resolution: vec3;
    toDisplayString(): string;
    toStrippedMultiscaleDataSource(session: Session) : Promise<IMultiscaleDataSource>;
}
