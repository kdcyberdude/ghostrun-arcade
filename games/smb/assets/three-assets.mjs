// Pass your installed THREE namespace. Assets remain native-resolution pixels.
export async function loadPixelTexture(THREE, url) {
  const texture = await new THREE.TextureLoader().loadAsync(url);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Rect is [x,y,width,height], measured from the PNG's top left.
// One world unit per source pixel. Use an orthographic camera and integer positions.
export function pixelQuad(THREE, texture, rect, {sprite = true} = {}) {
  const [x, y, width, height] = rect;
  const image = texture.image;
  const geometry = new THREE.PlaneGeometry(width, height);
  const left = x / image.width, right = (x + width) / image.width;
  const top = 1 - y / image.height, bottom = 1 - (y + height) / image.height;
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
    left, top, right, top, left, bottom, right, bottom
  ], 2));
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: sprite, alphaTest: sprite ? 0.5 : 0,
    toneMapped: false, depthWrite: !sprite
  });
  return new THREE.Mesh(geometry, material);
}

export function pixelCamera(THREE, width = 256, height = 240) {
  const camera = new THREE.OrthographicCamera(0, width, height, 0, 0.1, 100);
  camera.position.z = 10;
  return camera;
}
