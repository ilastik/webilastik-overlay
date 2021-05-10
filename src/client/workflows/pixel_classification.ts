import { Applet, IWidgetFactory } from "../applets/applet";
import { FeatureExtractor } from "../ilastik";

export class PixelClassificationWorkflow{
    public readonly feature_selection_applet: Applet<FeatureExtractor[]>
    protected constructor(params: {
        socket: WebSocket,
        feature_selection_widget_factory: IWidgetFactory<Array<FeatureExtractor>>,
    }){
        this.feature_selection_applet = new Applet<FeatureExtractor[]>({
            name: "feature_selection_applet",
            socket: params.socket,
            deserializer: FeatureExtractor.fromJsonList,
            widget_factory: params.feature_selection_widget_factory,
        })
    }
}


// export class PixelClassificationWorkflow{
//     private static instance: PixelClassificationWorkflow|undefined

//     public readonly data_selection_applet: itk.DataSelectionApplet;
//     public readonly feature_selection_applet: FeatureSelectorWidget;
//     public readonly brushing_applet: itk.BrushingApplet;
//     public readonly pixel_classifier_applet: itk.PixelClassificationApplet;
//     public readonly predictions_export_applet: itk.ExportApplet;

//     private constructor(socket: WebSocket, session_url: string){
//         this.data_selection_applet = new DataSelectionGui("data_selection_applet", socket);
//         this.feature_selection_applet = new FeatureSelectorGui("feature_selection_applet", socket);
//         this.brushing_applet = new itk.BrushingApplet("brushing_applet", socket);
//         this.pixel_classifier_applet = new PixelClassificationGui("pixel_classifier_applet", socket, session_url);
//         this.predictions_export_applet = new itk.ExportApplet("predictions_export_applet", socket);
//     }

//     private static async create() : Promise<PixelClassificationWorkflow>{
//         let response = await fetch(ilastikApiUrl + "/session", {
//             method: "POST",
//             body: JSON.stringify({"session_duration": 600}),
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//         });
//         const payload = await response.json()
//         const session_id = payload["id"]
//         for(let i=0; i<10; i++){
//             let session_status_resp = await fetch(ilastikApiUrl + "/session/" + session_id)
//             let session_status = await session_status_resp.json()
//             if(session_status["status"] != "ready"){
//                 await sleep(2000)
//                 continue
//             }
//             let session_url = new URL(session_status["url"])
//             let socket = await websocket_connect(`ws://${session_url.hostname}:${session_url.port}${session_url.pathname}/ws${session_url.search}`)
//             return new PixelClassificationWorkflow(socket, session_url.toString())
//         }
//         throw "Gave up waiting for session to spawn"
//     }

//     public static getFirstManagedLayer(): ManagedUserLayer|undefined{
//       const viewer = <Viewer>((<any>window)['viewer']);
//       const layerManager = viewer.layerSpecification.layerManager;
//       return layerManager.managedLayers[0]
//     }

//     public static async getInstance(): Promise<PixelClassificationWorkflow>{
//         if(this.instance !== undefined){
//             return this.instance
//         }
//         let instance = await PixelClassificationWorkflow.create() //FIXME: theere might be racing here

//         const managedLayer = this.getFirstManagedLayer();
//         if(managedLayer !== undefined){
//             var data_url = (<ManagedUserLayerWithSpecification>managedLayer).sourceUrl!
//             if(data_url.startsWith("precomputed://")){//Only precomputed chunks support for now!
//                 data_url += "/data" //FIXME: this assume sa single scale ant that its key is "data"
//                 console.log(`Adding datasource with this URL: ${data_url}`)
//                 const datasource = new itk.DataSource(data_url, new itk.Shape5D({x: 0, y:0, z:0, t:0, c: 0}))
//                 const lane = new itk.Lane(datasource)
//                 await instance.data_selection_applet.add([lane])
//             }
//         }

//         //let data_url = "precomputed://http://localhost:5001/datasource/3494c45e-e691-498f-96d7-4c06d6fbedae/data" //FIXME: remove this hardcoding
//         if(this.instance !== undefined){
//             return this.instance
//         }
//         this.instance = instance
//         return instance
//     }

//     // public downloadIlp(){
//     //     const ilp_form = <HTMLFormElement>createElement({tagName: "form", parentElement: document.body, innerHTML:`
//     //         <input type="text" name="__self__.__class__", value="JsonReference"/>
//     //         <input type="text" name="__self__.object_id", value="${this.id}"/>
//     //         <input type="submit"/>
//     //     `})
//     //     ilp_form.style.display = "none"
//     //     ilp_form.action = `${ilastikApiUrl}/rpc/ilp_project`
//     //     ilp_form.method = "post"
//     //     ilp_form.submit()
//     // }

//     // public async upload_to_cloud_ilastik(cloud_ilastik_token: string, project_name: string): Promise<any>{
//     // }
// }
