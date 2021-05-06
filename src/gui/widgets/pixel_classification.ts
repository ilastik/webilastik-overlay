import { IViewerDriver } from "../.."
import { uuidv4 } from "../../util/misc"

export class PixelClassificationWidget{
    public readonly viewer_driver: IViewerDriver
    public readonly session_url: string
    public constructor({session_url, viewer_driver}: {
        session_url: string, viewer_driver: IViewerDriver
    }){
        this.session_url = session_url
        this.viewer_driver = viewer_driver
    }
    protected updateState(_: any){
        let lane_index = 0 //FIXME: remove hardcoding?
        let predictions_url = `precomputed://${this.session_url}/predictions_export_applet/${uuidv4()}/${lane_index}`
        console.log(`Will try to refresh predictions with this url: ${predictions_url}`)
        // this.viewer.refreshLayer('predictions', predictions_url, event_payload["predictions_shader"]) //FIXME: use viewer_driver
    }
}
