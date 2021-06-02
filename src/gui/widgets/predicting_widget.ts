import { vec3 } from "gl-matrix";
import { Applet } from "../../client/applets/applet";
import { DataSource, Session } from "../../client/ilastik";
import { IViewerDriver } from "../../drivers/viewer_driver";
import { uuidv4 } from "../../util/misc";
import { ensureJsonArray, ensureJsonBoolean, ensureJsonNumber, ensureJsonObject, JsonObject, JsonValue } from "../../util/serialization";

class PredictingAppletState{
    constructor(
        public readonly producer_is_ready: boolean,
        public readonly channel_colors: Array<vec3>,
        public readonly datasources: Array<DataSource>,
    ){}

    public toJsonValue(): JsonObject{
        return {
            producer_is_ready: this.producer_is_ready,
            datasources: this.datasources.map(ds => ds.toJsonValue()),
        }
    }

    public static fromJsonValue(value: JsonValue): PredictingAppletState{
        let obj = ensureJsonObject(value)
        let producer_is_ready = ensureJsonBoolean(obj["producer_is_ready"])
        let channel_colors = ensureJsonArray(obj["channel_colors"]).map(raw_color => {
            const color_obj = ensureJsonObject(raw_color)
            return vec3.fromValues(
                ensureJsonNumber(color_obj["r"]), ensureJsonNumber(color_obj["g"]), ensureJsonNumber(color_obj["b"])
            )
        })
        let datasources = ensureJsonArray(obj["datasources"]).map(rds => DataSource.fromJsonValue(rds))
        return new PredictingAppletState(producer_is_ready, channel_colors, datasources)
    }
}

export class PredictingWidget extends Applet<PredictingAppletState>{
    constructor({session, viewer_driver}: {session: Session, viewer_driver: IViewerDriver}){
        super({
            deserializer: PredictingAppletState.fromJsonValue,
            name: "predicting_applet",
            session,
            onNewState: (new_state) => {
                if(!new_state.producer_is_ready){
                    return
                }
                let views = new_state.datasources.map((ds, ds_index) => {
                    let encoded_ds_url = btoa(ds.url.toString()).replace("+", "-").replace("/", "_")
                    let run_id = uuidv4()
                    return {
                        name: `lane${ds_index}`,
                        url: `precomputed://${this.session.session_url.toString()}/${this.name}/datasource=${encoded_ds_url}/run_id=${run_id}`,
                    }
                })
                viewer_driver.refreshViews(views, new_state.channel_colors)
            }
        })
    }
}