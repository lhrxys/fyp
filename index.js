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
        //findVertices();
        check();
        show();
      };
      img.src = URL.createObjectURL(input.files[0]);
    };
};
  
let pic = []; 
let size = []; // stores size of image for easy ref
let explored = [];
let edges = new Map;
let blackPixels = [];
let vertices = [];

const process_img = (img) => {
    pic = [];
    explored = [];
    blackPixels = [];
    vertices = [];
    edges.clear();

    const w = 400;
    const h = Math.floor(w*img.height/img.width);
    size = [w+10, h+10];
    explored = Array(h+10).fill().map(() => Array(w+10).fill(false));

    const canvas = document.createElement("canvas");
    images.append(canvas);
    
    // set styles of img and canvas
    img.width = w;
    img.height = h;
    img.style.margin = "2px";
    canvas.width = w + 10;
    canvas.height = h + 10;
    canvas.style.margin = "2px";
    

    const context = canvas.getContext("2d");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 5, 5, w, h);

    
    const frame = context.getImageData(0, 0, w+10, h+10);
    const data = frame.data;
    canvas.setAttribute("id", "original");
    
    
    for (let y = 0; y < (h+10); ++y) {
        pic[y] = [];
        for (let x = 0; x < (w+10); ++x) {
            // turns the image into black and white (not greyscale)
            const i = ((w+10)*y + x) << 2;
            const [r, g, b, a] = [0, 1, 2, 3].map(j => data[i + j]);
            //changes to white if avg is more than 200 
            const v = (Math.floor((r + g + b)/3) > 170) ? 255 : 0;
            
            const color = [v, v, v, 255];
            color.forEach((c, j) => data[i + j] = c);
            pic[y].push(v); //add pixel to data array
            
        };
    };

    //255 white, 0 black
    context.putImageData(frame, 0, 0);
};

let faces = new Map;

const loopImage = () => {
  faces.clear();
  let n = 0; // number of white regions
  let pixel = 0;

  while (pixel < (size[0]*size[1])) {
    let row = Math.floor(pixel / size[0]);
    let col = pixel % size[0]; 

    if (explored[row][col] != false) {
      pixel += 1;
      continue
    };

    // white pixel
    if (pic[row][col] == 255) {
      flood(row, col, n);
      if (faces.get(n).length < 10) { //get rid of stray cases with less than 10 px in face
        faces.delete(n)
        continue;
      };

      n += 1;
      pixel += 1;
      continue;
    };

    // black pixel
    explored[row][col] = true;
    blackPixels.push([row, col]);
    pixel += 1;
  };
};

const flood = (r, c, n) => {
  //let queue = new Set([`${r}c${c}`]);
  let queue = [[r, c]];
  let i = 0;
  faces.set(n, [`${r}c${c}`]);
  explored[r][c] = `f${n}`;

  while (i < queue.length) {
    // get pixel from queue
    let row = queue[i][0];
    let col = queue[i][1];
    i += 1;

    let neighbours = [[row-1, col], [row, col-1], [row, col+1], [row+1, col]];
    for (const pixel of neighbours) {
      // extract out the neighbour pixel coords
      let xn = pixel[0];
      let yn = pixel[1];

      // checks if neighbouring pixel exists
      if (xn < 0 || xn > size[1]-1 || yn < 0 || yn > size[0]-1) {continue};
      
      /*
      if (pic[xn][yn] == 0){
        markBorder(xn, yn, n);
      };
      */

      // skip if pixel was explored (also in queue alr)
      if (explored[xn][yn] != false) {continue};

      if (pic[xn][yn] == 255) { // if pixel is white + not in queue/explored --> push to queue
        faces.get(n).push(`${xn}c${yn}`);
        queue.push([xn, yn]);
        explored[xn][yn] = `f${n}`
        continue;
      };
      
      blackPixels.push([xn, yn]);
      explored[xn][yn] = true;
    };
    //console.log(explored);
  };
  console.log(`done with face ${n}`);
  return(faces);
  
};

let f = new Map;
const check = () => {
  for (const pixel of blackPixels) {
    let nearbyFaces = new Set; //contains which faces surround the edge
    let queue = [pixel];
    let checked = new Set([`${pixel[0]}c${pixel[1]}`]);
    let i = 0; // order which it is checked, to find dist from central pixel

    while (i < 24 && nearbyFaces.size < 3) { // current size set at 11x11 square
      let row = queue[i][0];
      let col = queue[i][1];
      i += 1;

      let neighbours = [[row-1, col-1], [row-1, col], [row-1, col+1], [row, col-1], [row, col+1], [row+1, col-1], [row+1, col], [row+1, col+1]];
      for (const n of neighbours) {
        // check if pixel exists
        if (n[0] < 0 || n[0] > size[1]-1 || n[1] < 0 || n[1] > size[0]-1) {continue};
        
        // if exists, check if in queue/checked already
        if (checked.has(`${n[0]}c${n[1]}`)){continue};
        
        // check if pixel is part of face
        let ex = explored[n[0]][n[1]];
        if (ex[0] == "f" && !nearbyFaces.has(ex)) {
          nearbyFaces.add(ex);
        };

        // add to queue
        checked.add(`${n[0]}c${n[1]}`);
        queue.push(n);
      };
    };
    
    if (nearbyFaces.size > 2) {
      vertices.push(pixel);
      nearbyFaces.add(i);
      f.set(pixel, nearbyFaces);
    };
  };
};

// RELOOK THIS FUNCTION, PROBABLY NOT VERY ACCURATE
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

//let vertices = [];
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
    //let row = Number(vertices[i].split("c")[0]);
    //let col = Number(vertices[i].split("c")[1]);
    const row = vertices[i][0];
    const col = vertices[i][1];
    const p = (size[0]*row + col) << 2;
    const red = [255, 0, 0, 255];
    red.forEach((c, j) => data[p + j] = c);
  };
  
  context.putImageData(frame, 0, 0);
};
    