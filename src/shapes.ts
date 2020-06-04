import {vec3, quat, mat4} from "gl-matrix";

import {Buffer} from "./glsl";
import {Camera} from "./camera";
import {StandardVAO} from "./standard_shader";

export class Cube{
    public readonly gl: WebGL2RenderingContext
    public position: vec3 //protecte with accessor?
    protected rotation: quat

    public readonly verts: Float32Array
//    public readonly vert_indices : Uint16Array

    private vert_buffer : Buffer<Float32Array>;
    private vao: StandardVAO;
    constructor({gl, position=vec3.fromValues(0,0,0), rotation=quat.create()}: {
        gl: WebGL2RenderingContext,
        position?: vec3,
        rotation?: quat
    }){
        this.gl = gl
        this.position = position
        this.rotation = rotation

        // this.verts = new Float32Array([
        //     // front face
        //     -1.0, -1.0,  1.0,
        //      1.0, -1.0,  1.0,
        //      1.0,  1.0,  1.0,
        //     -1.0,  1.0,  1.0,
            
        //     // back face
        //     -1.0, -1.0, -1.0,
        //     -1.0,  1.0, -1.0,
        //      1.0,  1.0, -1.0,
        //      1.0, -1.0, -1.0,
            
        //     // top face
        //     -1.0,  1.0, -1.0,
        //     -1.0,  1.0,  1.0,
        //      1.0,  1.0,  1.0,
        //      1.0,  1.0, -1.0,
            
        //     // bottom face
        //     -1.0, -1.0, -1.0,
        //      1.0, -1.0, -1.0,
        //      1.0, -1.0,  1.0,
        //     -1.0, -1.0,  1.0,
            
        //     // right face
        //      1.0, -1.0, -1.0,
        //      1.0,  1.0, -1.0,
        //      1.0,  1.0,  1.0,
        //      1.0, -1.0,  1.0,
            
        //     // left face
        //     -1.0, -1.0, -1.0,
        //     -1.0, -1.0,  1.0,
        //     -1.0,  1.0,  1.0,
        //     -1.0,  1.0, -1.0
        // ]);

        // this.vert_indices = new Uint16Array([                                                                           
        //     0,  1,  2,      0,  2,  3,    // front                                                                      
        //     4,  5,  6,      4,  6,  7,    // back                                                                       
        //     8,  9,  10,     8,  10, 11,   // top                                                                        
        //     12, 13, 14,     12, 14, 15,   // bottom                                                                     
        //     16, 17, 18,     16, 18, 19,   // right                                                                      
        //     20, 21, 22,     20, 22, 23,   // left                                                                       
        // ]);

        this.verts = new Float32Array([
            -1.0,  1.0,  1.0,     // Front-top-left
             1.0,  1.0,  1.0,     // Front-top-right
            -1.0, -1.0,  1.0,     // Front-bottom-left
             1.0, -1.0,  1.0,     // Front-bottom-right
             1.0, -1.0, -1.0,     // Back-bottom-right
             1.0,  1.0,  1.0,     // Front-top-right
             1.0,  1.0, -1.0,     // Back-top-right
            -1.0,  1.0,  1.0,     // Front-top-left
            -1.0,  1.0, -1.0,     // Back-top-left
            -1.0, -1.0,  1.0,     // Front-bottom-left
            -1.0, -1.0, -1.0,     // Back-bottom-left
             1.0, -1.0, -1.0,     // Back-bottom-right
            -1.0,  1.0, -1.0,     // Back-top-left
             1.0,  1.0, -1.0      // Back-top-right
        ]);


        this.vert_buffer = new Buffer(this.gl, "cube_vert_buffer", this.verts, "STATIC_DRAW");
        this.vao = new StandardVAO({gl: gl, a_position_buffer: this.vert_buffer})
    }

    public get object_to_world_matrix(): mat4{
        let out = mat4.create();
        mat4.fromRotationTranslation(out, this.rotation, this.position)
        return out
    }

    public render(camera: Camera){
        let object_to_clip_matrix = mat4.create()
        mat4.mul(object_to_clip_matrix, camera.world_to_perspective_matrix, this.object_to_world_matrix);
        this.vao.render({u_object_to_clip_value: object_to_clip_matrix});
    }
}