/**
 * provide raw scene & nodes data in glTF
 */
import { injectable } from 'inversify';
import { GltfAsset, GltfLoader, resolveURL } from 'gltf-loader-ts';
import { Node, Scene, Mesh, Material, Texture, BufferView, Accessor, GlTfId, Sampler } from 'gltf-loader-ts/lib/gltf';

const loader: GltfLoader = new GltfLoader();

export interface IGltfService {
    load(uri: string): void;
    getScene(): Scene;
    getNode(idx: number): Node;
    getMesh(idx: number | undefined): Mesh;
    getMaterial(idx: number): Material;
    getTexture(idx: number): Texture;
    getImage(idx: number): Promise<HTMLImageElement>;
    getSampler(idx: number): Sampler;
    getData(idx: number): Promise<{
        data: Uint8Array|Uint16Array|Float32Array|undefined;
        offset: number | undefined;
        stride: number | undefined;
    }>;
}

@injectable()
export class GltfService implements IGltfService {
    private asset: GltfAsset;
    private nodes: Node[] = [];
    private meshes: Mesh[] = [];
    private materials: Material[] = [];
    private textures: Texture[] = [];
    private accessors: Accessor[] = [];
    private bufferViews: BufferView[] = [];
    private samplers: Sampler[] = [];
    private scene: Scene;

    private bufferCache: {[key: string]: ArrayBuffer} = {};

    public async load(uri: string): Promise<void> {
        this.clean();
        const asset: GltfAsset = await loader.load(uri);
        this.asset = asset;

        const { nodes, scene: sceneIdx, scenes, meshes,
            materials, textures, accessors, bufferViews, samplers } = asset.gltf;
        if (scenes && nodes) {
            this.scene = scenes[sceneIdx || 0];
            this.nodes = nodes;
        }
        if (meshes) {
            this.meshes = meshes;
        }
        if (materials) {
            this.materials = materials;
        }
        if (textures) {
            this.textures = textures;
        }
        if (accessors) {
            this.accessors = accessors;
        }
        if (bufferViews) {
            this.bufferViews = bufferViews;
        }
        if (samplers) {
            this.samplers = samplers;
        }
    }

    public getScene(): Scene {
        return this.scene;
    }

    public getNode(idx: number): Node {
        return this.nodes[idx];
    }

    public getMesh(idx: number): Mesh {
        return this.meshes[idx];
    }

    public getMaterial(idx: number): Material {
        return this.materials[idx];
    }

    public getTexture(idx: number): Texture {
        return this.textures[idx];
    }

    public getImage(idx: number): Promise<HTMLImageElement> {
        return this.asset.imageData.get(idx);
    }

    public getSampler(idx: number): Sampler {
        return this.samplers[0];
    }

    private async getBinData(index: GlTfId): Promise<ArrayBuffer> {
        if (this.bufferCache[index] !== undefined) {
            return this.bufferCache[index];
        }

        const gltf = this.asset.gltf;
        if (!gltf.buffers) {
            /* istanbul ignore next */
            throw new Error('No buffers found.');
        }
        const buffer = gltf.buffers[index];
        // If present, GLB container is required to be the first buffer.
        // if (buffer.uri === undefined) {
        //     /* istanbul ignore next */
        //     if (index !== 0) { throw new Error('GLB container is required to be the first buffer'); }
        //     if (this.asset.glbData === undefined) {
        //         throw new Error('invalid gltf: buffer has no uri nor is there a GLB buffer');
        //     }
        //     return this.asset.glbData.binaryChunk;
        // }

        const url = resolveURL(buffer.uri || '', this.asset.bufferData.baseUri);
        const bufferData: ArrayBuffer = await this.asset.bufferData.loader.load(url);
        
        this.bufferCache[index] = bufferData;
        return bufferData;
    }

    public async getData(idx: number) {
        const accessor = this.accessors[idx];
        const bufferView = this.bufferViews[accessor.bufferView || 0];

        const bufferData = await this.getBinData(bufferView.buffer);

        const start = bufferView.byteOffset || 0;
        const end = start + bufferView.byteLength;
        const slicedBuffer = bufferData.slice(start, end);

        let bufferDataView;
        if (accessor.componentType === 5123) {
            bufferDataView = new Uint16Array(slicedBuffer);
        } else if (accessor.componentType === 5126) {
            bufferDataView = new Float32Array(slicedBuffer);
        } else {
            bufferDataView = new Uint8Array(slicedBuffer);
        }

        return {
            data: bufferDataView,
            stride: bufferView.byteStride,
            offset: accessor.byteOffset
        }
    }
    
    private clean() {
        this.bufferCache = {};
        this.nodes = [];
        this.materials = [];
        this.meshes = [];
        this.samplers = [];
        this.textures = [];
    }
}
