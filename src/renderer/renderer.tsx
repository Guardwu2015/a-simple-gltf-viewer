/**
 * React renderer.
 */
import { GltfViewer } from '@/index';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as dat from 'dat.gui';
import ReactLoading from 'react-loading';
import Layers from './Layers';

// Import the styles here to process them with webpack
import '@public/style.css';

class App extends React.Component<{}, {
  loading: boolean;
  showLayers: boolean;
  size: { width: number; height: number };
}> {
  public readonly state = {
    loading: false,
    showLayers: false,
    size: { width: 1, height: 1 }
  };

  private viewer: GltfViewer;
  
  componentDidMount() {
    this.viewer = new GltfViewer({
      container: 'viewer-container',
      onResize: this.handleResize
    });
    this.viewer.init();

    const gui = new dat.GUI();
    const folder = gui.addFolder('glTF viewer');

    const models = ['Triangle', 'Box', 'BoxTextured', 'DamagedHelmet', 'Corset', 
      'MetalRoughSpheres'
    ];
    const layers = ['layers', 'final', 'albedo', 'normal', 'metallic', 'roughness', 'wireframe'];

    const text = { Model: 'DamagedHelmet', Layer: 'layers' };
    folder.add(text, 'Model', models).onChange(this.loadModel);
    folder.add(text, 'Layer', layers).onChange(this.showLayer);

    const wireframeFolder = folder.addFolder('wireframe');
    const wireframe = { lineColor: [255, 255, 255], lineWidth: 1 };
    wireframeFolder.addColor(wireframe, 'lineColor').onChange(this.changeWireframeLineColor);
    wireframeFolder.add(wireframe, 'lineWidth', 1, 5).onChange(this.changeWireframeLineWidth);

    const lightFolder = folder.addFolder('directional light');
    const directionalLight = { color: [0, 0, 0], rotation: 0, pitch: 0 };
    lightFolder.addColor(directionalLight, 'color').onChange(this.changeDirectionalLightColor);
    lightFolder.add(directionalLight, 'rotation', 0, 360)
      .onChange(() => this.changeDirectionalLightDirection(directionalLight.rotation, directionalLight.pitch));
    lightFolder.add(directionalLight, 'pitch', -90, 90)
      .onChange(() => this.changeDirectionalLightDirection(directionalLight.rotation, directionalLight.pitch));
    folder.open();

    this.showLayer('layers');
    this.loadModel('DamagedHelmet');
  }

  loadModel = async (modelName: string) => {
    this.setState({ loading: true });
    await this.viewer.load(
      `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/${modelName}/glTF/${modelName}.gltf`);
    this.setState({ loading: false });
  };

  showLayer = (layerName: string) => {
    this.setState({ showLayers: layerName === 'layers' });
    this.viewer.showLayer(layerName);
  };

  changeWireframeLineColor = (color: number[]) => {
    this.viewer.setWireframeLineColor(color.map(c => c / 255));
  }
  
  changeWireframeLineWidth = (width: number) => {
    this.viewer.setWireframeLineWidth(width);
  }

  changeDirectionalLightColor = (color: number[]) => {
    this.viewer.setDirectionalLightColor(color.map(c => c / 255));
  }

  changeDirectionalLightDirection = (rotation: number, pitch: number) => {
    var rot = rotation * Math.PI / 180;
    var pitch = pitch * Math.PI / 180;

    this.viewer.setDirectionalLightDiretion([
      Math.sin(rot) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(rot) * Math.cos(pitch)
    ]);
  }

  handleResize = (size: { width: number; height: number }) => {
    this.setState({ size });
  }

  render() {
    const { loading, showLayers, size } = this.state;
    return <>
      {loading && <div style={{
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-32px, -32px)',
        zIndex: 1
      }}>
        <ReactLoading type="balls" color="blue" height={'64px'} width={'64px'}/></div>}
      <div id="viewer-container"></div>
      {!loading && showLayers && <Layers size={size}/>}
    </>
  }
}

ReactDOM.render(
  <App/>,
  document.getElementById('app')
);
