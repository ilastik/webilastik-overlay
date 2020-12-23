import { mat4, quat, ReadonlyVec3, vec3 } from "gl-matrix";
import { FrontFace } from "./gl";
import { Triangle, TriangleArray, VertexPrimitive } from "./vertex_primitives";


enum X{
    RIGHT = 1,
    LEFT = -1,
}

enum Y{
    TOP = 1,
    BOTTOM = -1,
}

enum Z{
    BACK = 1,
    FRONT = -1, //forwards is -z like in the camera
}

function vert(x: X, y: Y, z: Z): vec3{
    return vec3.fromValues(x,y,z)
}

export class MeshObject{
    public readonly gl: WebGL2RenderingContext

    public position: vec3 //protecte with accessor?
    public scale: vec3
    public orientation: quat
    public readonly vertices: VertexPrimitive

    constructor({
        gl,
        position=vec3.fromValues(0,0,0),
        scale=vec3.fromValues(1,1,1),
        orientation=quat.create(),
        vertices,
    }: {
        gl: WebGL2RenderingContext,
        position? : vec3,
        scale?: vec3,
        orientation?: quat,
        vertices: VertexPrimitive
    }){
        this.gl = gl
        this.position = position
        this.scale = scale
        this.orientation = orientation
        this.vertices = vertices
    }

    public rotateY(angle: number){
        quat.rotateY(this.orientation, this.orientation, angle)
    }

    public moveTo(point: ReadonlyVec3){
        vec3.copy(this.position, point)
    }

    public get object_to_world_matrix(): mat4{
        let out = mat4.create();
        mat4.fromRotationTranslationScale(out, this.orientation, this.position, this.scale)
        return out
    }
}

export class Cube extends MeshObject{
    constructor(params: {
        gl: WebGL2RenderingContext,
        position? : vec3,
        scale?: vec3,
        orientation?: quat,
    }){
        super({
            ...params,
            vertices: TriangleArray.fromIndividualTriangles([
                ...Cube.frontFace(),
                ...Cube.backFace(),
                ...Cube.rightFace(),
                ...Cube.leftFace(),
                ...Cube.topface(),
                ...Cube.backFace()
            ])
        })
    }

    public static backFace() : [Triangle, Triangle]{
        return [
            Triangle.fromVerts(
                vert(X.LEFT,  Y.TOP,    Z.BACK),
                vert(X.LEFT,  Y.BOTTOM, Z.BACK),
                vert(X.RIGHT, Y.BOTTOM, Z.BACK),
            ),
            Triangle.fromVerts(
                vert(X.LEFT,  Y.TOP,    Z.BACK),
                vert(X.RIGHT, Y.BOTTOM, Z.BACK),
                vert(X.RIGHT, Y.TOP,    Z.BACK),
            ),
        ]
    }
    public static frontFace() : [Triangle, Triangle]{
        return [
            Triangle.fromVerts(
                vert(X.LEFT,  Y.TOP,    Z.FRONT),
                vert(X.LEFT,  Y.BOTTOM, Z.FRONT),
                vert(X.RIGHT, Y.BOTTOM, Z.FRONT),
                FrontFace.CW //verts are being given clockwise
            ),
            Triangle.fromVerts(
                vert(X.LEFT,  Y.TOP,    Z.FRONT),
                vert(X.RIGHT, Y.BOTTOM, Z.FRONT),
                vert(X.RIGHT, Y.TOP,    Z.FRONT),
                FrontFace.CW //verts are being given clockwise
            ),
        ]
    }
    public static rightFace(): [Triangle, Triangle]{
        return [
            Triangle.fromVerts(
                vert(X.RIGHT, Y.TOP,    Z.BACK),
                vert(X.RIGHT, Y.BOTTOM, Z.BACK),
                vert(X.RIGHT, Y.BOTTOM, Z.FRONT),
            ),
            Triangle.fromVerts(
                vert(X.RIGHT, Y.TOP,    Z.BACK),
                vert(X.RIGHT, Y.BOTTOM, Z.FRONT),
                vert(X.RIGHT, Y.TOP,    Z.FRONT),
            )
        ]
    }
    public static leftFace(): [Triangle, Triangle]{
        return [
            Triangle.fromVerts(
                vert(X.LEFT, Y.TOP,    Z.BACK),
                vert(X.LEFT, Y.BOTTOM, Z.BACK),
                vert(X.LEFT, Y.BOTTOM, Z.FRONT),
                FrontFace.CW // verts are being given clockwise
            ),
            Triangle.fromVerts(
                vert(X.LEFT, Y.TOP,    Z.BACK),
                vert(X.LEFT, Y.BOTTOM, Z.FRONT),
                vert(X.LEFT, Y.TOP,    Z.FRONT),
                FrontFace.CW // verts are being given clockwise
            )
        ]
    }
    public static topface(): [Triangle, Triangle]{
        return [
            Triangle.fromVerts(
                vert(X.LEFT,  Y.TOP, Z.FRONT),
                vert(X.LEFT,  Y.TOP, Z.BACK),
                vert(X.RIGHT, Y.TOP, Z.BACK),
            ),
            Triangle.fromVerts(
                vert(X.LEFT,  Y.TOP, Z.FRONT),
                vert(X.RIGHT, Y.TOP, Z.BACK),
                vert(X.RIGHT, Y.TOP, Z.FRONT),
            ),
        ]
    }
    public static bottomface(): [Triangle, Triangle]{
        return [
            Triangle.fromVerts(
                vert(X.LEFT,  Y.BOTTOM, Z.FRONT),
                vert(X.LEFT,  Y.BOTTOM, Z.BACK),
                vert(X.RIGHT, Y.BOTTOM, Z.BACK),
                FrontFace.CW // verts are being given clockwise
            ),
            Triangle.fromVerts(
                vert(X.LEFT,  Y.BOTTOM, Z.FRONT),
                vert(X.RIGHT, Y.BOTTOM, Z.BACK),
                vert(X.RIGHT, Y.BOTTOM, Z.FRONT),
                FrontFace.CW // verts are being given clockwise
            ),
        ]
    }
}