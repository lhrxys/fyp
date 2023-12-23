window.onload = () => {
    const input = document.getElementById("input");
    const images = document.getElementById("images");
    input.onchange = () => {
      images.replaceChildren();
      const img = document.createElement("img");
      images.append(img);
      img.onload = () => {
        process_img(img);
        console.log("processed img");
        loopImage();
        findVertices();
        show();
      };
      img.src = URL.createObjectURL(input.files[0]);
    };
};
  
let pic = []; 
let size = []; // stores size of image for easy ref
let possible = []; // stores possible convolutions that may contain a vertex
let unexplored = new Set;
let edges = new Map;

const process_img = (img) => {
    const w = 400;
    const h = Math.floor(w*img.height/img.width);
    size = [w, h];
    const canvas = document.createElement("canvas");
    images.append(canvas);
    for (const el of [img, canvas]) {
        el.width = w;
        el.height = h;
        el.style.margin = "2px";
    }
    const context = canvas.getContext("2d");
    context.drawImage(img, 0, 0, w, h);

    // add a 5px white border around image
    //context.strokeStyle = "white";
    //context.lineWidth = 5;
    //context.strokeRect(1, 1, w, h);
      
    const frame = context.getImageData(0, 0, w, h);
    const data = frame.data;
    canvas.setAttribute("id", "original");
      
    pic = [];
    unexplored.clear();
    edges.clear();
    for (let y = 0; y < h; ++y) {
        pic[y] = [];
        for (let x = 0; x < w; ++x) {
            // turns the image into black and white (not greyscale)
            const i = (w*y + x) << 2;
            const [r, g, b, a] = [0, 1, 2, 3].map(j => data[i + j]);
            //changes to white if avg is more than 200 
            const v = (Math.floor((r + g + b)/3) > 220) ? 255 : 0;
            
            const color = [v, v, v, 255];
            color.forEach((c, j) => data[i + j] = c);
            pic[y].push(v); //add pixel to data array
            unexplored.add(`${y}c${x}`);
        };
    };
      
    //255 white, 0 black
    context.putImageData(frame, 0, 0);
};

let faces = new Map;

/*
for (let x = 0; x < 5; x++) {
  for (let y = 0; y < 5; y++) {
    unexplored.set(`${x}c${y}`, true);
  };
};
*/
const loopImage = () => {
  faces.clear();

  let n = 0; // number of white regions
  while (unexplored.size > 0) {
    // get current first key in unexplored
    let check = unexplored.values().next().value.split("c");
    let xs = Number(check[0]);
    let ys = Number(check[1]);
    if (pic[xs][ys] == 255) {
      flood(xs, ys, n);
      if (faces.get(n).length < 10) { //get rid of stray cases with less than 10 px in face
        faces.delete(n)
        continue;
      };
      n += 1;
      continue;
    };
    unexplored.delete(`${xs}c${ys}`); // removes from unexplored if black pixel
  };
};

const flood = (r, c, n) => {
  let queue = [[r, c]];
  faces.set(n, [`${r}c${c}`]);


  while (queue.length > 0) {
    let current = queue.shift();
    let row = current[0];
    let col = current[1];
    
    unexplored.delete(`${row}c${col}`);

    // find neighbours of pixel which existl
    let neighbours = [[row-1, col], [row, col-1], [row, col+1], [row+1, col]];
    if ((row-1 < 0) || (row+1 > size[1]-1)) {
      let remove = (row-1 < 0) ? (row-1) : (row+1);
      neighbours = neighbours.filter(n => (n[0] != remove));
    };

    if ((col-1 < 0) || (col+1 > size[0]-1)) {
      let remove = (col-1 < 0) ? (col-1) : (col+1);
      neighbours = neighbours.filter(n => (n[1] != remove));
    };
    
    //console.log(current);
    //console.log(neighbours);
  
    
    for (let j = 0; j < neighbours.length; j++) {
      let currN = neighbours[j];
      let xn = currN[0];
      let yn = currN[1];
      if (pic[xn][yn] == 0){
        markBorder(xn, yn, n);
      };

      // skip if pixel was explored
      if (!unexplored.has(`${xn}c${yn}`)) {continue;}

      // skip if pixel already in queue
      let queueString = JSON.stringify(queue);
      let currString = JSON.stringify(currN);
      if (queueString.includes(currString)) {continue;}

      if (pic[xn][yn] == 255) { // if pixel is white + not in queue/explored --> push to queue
        faces.get(n).push(`${xn}c${yn}`);
        queue.push(currN);
        continue;
      };
      unexplored.delete(`${xn}c${yn}`); // push to explored if pixel is black (will not be added to queue)
    };
    //console.log(explored);
  };
  console.log(`done with face ${n}`);
  return(faces);
  
};

const markBorder = (x, y, n) => {
  const add = [-3, -2, -1, 0, 1, 2, 3];
  const horizontal = add.map((col) => col + y);
  const vertical = add.map((row) => row + x);

  for (let i = 0; i < 7; i++) {
    let h = horizontal[i];
    if (h < 0 || h > size[0]-1 || pic[x][h] != 0) {continue;}
    
    let pixelkey = `${x}c${h}`; 
    if (!edges.has(pixelkey)){
      edges.set(pixelkey, [n]);
    } else if (!edges.get(pixelkey).includes(n)){
      edges.get(pixelkey).push(n);
    };
  };
  
  for (let i = 0; i < 7; i++) {
    let v = vertical[i];
    if (v < 0 || v > size[1]-1 || pic[v][y] != 0) {continue;}
    
    let pixelkey = `${v}c${y}`; 
    if (!edges.has(pixelkey)){
      edges.set(pixelkey, [n]);
    } else if (!edges.get(pixelkey).includes(n)){
      edges.get(pixelkey).push(n);
    };
  };
};

let vertices = [];
const findVertices = () => {
  vertices = [];
  edges.forEach((totalFaces, pixel) => {
    if (totalFaces.length > 2) {
      vertices.push(pixel);
    };
  });
};

// shows the identified areas
const show = () => {
  const canvas = document.createElement("canvas");
  images.append(canvas);
  canvas.width = size[0];
  canvas.height = size[1];
  canvas.style.margin = "2px";
    
  const context = canvas.getContext("2d");
  const orig = document.getElementById("original");
  context.drawImage(orig, 0, 0);
    
  const frame = context.getImageData(0, 0, size[0], size[1]);
  const data = frame.data;
  
  for (let i = 0; i < vertices.length; i++) {
    let row = Number(vertices[i].split("c")[0]);
    let col = Number(vertices[i].split("c")[1]);
    const p = (size[0]*row + col) << 2;
    const red = [255, 0, 0, 255];
    red.forEach((c, j) => data[p + j] = c);
  };
  
  context.putImageData(frame, 0, 0);
};
    