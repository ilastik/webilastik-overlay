import { Session } from "../ilastik";

export class PixelClassificationSession extends Session{
    public async close(): Promise<true | undefined>{
        let close_session_response = await fetch(this.session_url + `/close`, {method: "DELETE"})
        if(close_session_response.ok){
            return undefined
        }
        return true
    }
}
