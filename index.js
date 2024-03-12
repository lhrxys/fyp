window.onload = () => {
  const input = document.getElementById("input");
  const images = document.getElementById("images");

  input.onchange = () => {
    images.replaceChildren();
    const img = document.createElement("img");
    images.append(img);
    img.onload = () => {
      process_img(img); // changes to b&w
      console.log("processed img"); 
      loopImage(); // finds faces in CP
    };
    img.src = URL.createObjectURL(input.files[0]);
  };

  const process_button = document.getElementById("process");
  process_button.onclick = () => {
    const input_thres = document.getElementById("threshold").value;
    check(input_thres); // check which black pixels can be vertices
    countVertices(); // count number of vertices
    show(); // shows vertices in red
    connect();
    //connect2();
    //show_color();
    shrink();
    show_vertices();
  };

  /*
  const change_thres = document.getElementById("change_thres");
  change_thres.onclick = () => {
    thres_vertices = [];
    let i = 1;
    //for (let i = 1; i < 51; i++) {
    while (true) {
      check(i);
      thres_vertices.push(countVertices());
      console.log(`done with thres ${i}`);
      if (thres_vertices[i-1] == 1 || i > 50) {break;}
      i += 1;
    };
    
  };
  */

  const find_thres = document.getElementById("find");
  find_thres.onclick = () => {
    let thres = 1;
    let allVertices = [0];
    let same = 1;
    while (thres < 30 && same < 3) {
      check(thres);
      allVertices.push(countVertices());
      console.log(allVertices);
      if (allVertices[thres] == allVertices[thres-1]) {
        same += 1;
        thres += 1;
        continue;
      };
      same = 1;
      thres += 1;
    };
    show();
    connect();
    //connect2();
    shrink();
    show_vertices();
  };

};
  
let pic = []; // stores all pixel values of image
let size = []; // stores size of image for easy ref
let explored = []; // internal representation of image, updates the faces of white pixels
let blackPixels = []; // array of all black pixels stored in [row, col]
let vertices = []; // array of vertex coordinates
let verticesSet = new Set; // same as vertices but in Set datastructure
let thres_vertices = [];
let graph = new Map; // key: vertex number; value: faces surrounding it

const process_img = (img) => {
    pic = [];
    explored = [];
    blackPixels = [];

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
            const v = (Math.floor((r + g + b)/3) > 190) ? 255 : 0;
            
            const color = [v, v, v, 255];
            color.forEach((c, j) => data[i + j] = c);
            pic[y].push(v); //add pixel to data array
            
        };
    };

    //255 white, 0 black
    context.putImageData(frame, 0, 0);
};

let faces = new Map; //

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
  let queue = [[r, c]];
  let i = 0;
  faces.set(n, [`${r}c${c}`]);
  explored[r][c] = `f${n}`;

  while (i < queue.length) {
    // get pixel from queue
    let row = queue[i][0];
    let col = queue[i][1];
    i += 1;

    //CHANGE BELOW LINE
    let neighbours = [[-1, 0], [0, -1], [0, 1], [1, 0]];
    for (const pixel of neighbours) {
      // extract out the neighbour pixel coords
      let xn = pixel[0] + row;
      let yn = pixel[1] + col;

      // checks if neighbouring pixel exists
      if (xn < 0 || xn > size[1]-1 || yn < 0 || yn > size[0]-1) {continue};

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

let vertex_faces = new Map; // key: [row, col]; value: nearbyFaces
let vertex_dist = new Map;
const check = (thres) => { // checks which black pixels are vertices for given threshold
  verticesSet.clear(); // same as vertices but in a set
  vertices = [];
  vertex_faces.clear(); 
  
  for (const pixel of blackPixels) {
    let nearbyFaces = new Set; //contains which faces surround the edge
    const r = pixel[0];
    const c = pixel[1];
    let queue = [[r, c, 0]];
    let checked = new Set([`${r}c${c}`]);
    let i = 0; 
    let d = 0; // dist from central pixel

    while (d < thres && nearbyFaces.size < 3) { // current size set at 11x11 square
      let row = queue[i][0];
      let col = queue[i][1];
      d = queue[i][2];
      i += 1;

      let neighbours = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
      for (const n of neighbours) {
        // coords of neighbour
        let nRow = n[0] + row;
        let nCol = n[1] + col;

        // check if pixel exists
        if (nRow < 0 || nRow > size[1]-1 || nCol < 0 || nCol > size[0]-1) {continue};
        
        // if exists, check if in queue/checked already
        if (checked.has(`${nRow}c${nCol}`)){continue};
        
        // check if pixel is part of face
        let ex = explored[nRow][nCol];
        if (ex[0] == "f" && !nearbyFaces.has(ex)) {
          nearbyFaces.add(Number(ex.substring(1)));
        };

        // add to queue
        checked.add(`${nRow}c${nCol}`);
        queue.push([nRow, nCol, d+1]);
      };
    };
    
    
    if (nearbyFaces.size > 2) {
      vertices.push(pixel);
      verticesSet.add(`${r}c${c}`);
      //nearbyFaces.add(i);
      vertex_faces.set(`${r}c${c}`, nearbyFaces); //need to change to update the distance d
      vertex_dist.set(`${r}c${c}`, d);
    };
  };
};

let v = new Map; // key: vertex number; value: array of pixel coords
const countVertices = () => {
  v.clear();
  graph.clear();
  let checked = new Set;
  let vertexNum = 1;
  for (const p of vertices) {
    if (checked.has(`${p[0]}c${p[1]}`)) {continue};
    let queue = [p];
    explored[p[0]][p[1]] = `v${vertexNum}`; // update pixel in the 2d array of the image
    let i = 0;
    v.set(vertexNum, [p]);

    while (i < queue.length) {
      let row = queue[i][0];
      let col = queue[i][1];
      i+=1;
      //console.log(queue);

      let neighbours = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
      for (const n of neighbours) {
        // coords of neighbour
        let nRow = n[0] + row;
        let nCol = n[1] + col;
        //console.log([nRow, nCol]);

        if (checked.has(`${nRow}c${nCol}`)) {continue}; // check if pixel was seen before

        if (verticesSet.has(`${nRow}c${nCol}`)) { // check if pixel exists in vertices
          queue.push([nRow, nCol]);
          v.get(vertexNum).push([nRow, nCol]);
          explored[nRow][nCol] = `v${vertexNum}`;
        };
        checked.add(`${nRow}c${nCol}`);
      };

    };
    
    let curr = v.get(vertexNum);
    if (curr.length < 5) {
      for (const r of curr) { // revert pixels back if vertex is too small
        explored[r[0]][r[1]] = true;
      };
      v.delete(vertexNum);
      continue;
    };
    graph.set(vertexNum, new Set);
    vertexNum += 1;
  };
  return v.size;
};


// shows the identified vertex pixels
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
    const row = vertices[i][0];
    const col = vertices[i][1];
    const p = (size[0]*row + col) << 2;
    const red = [255, 0, 0, 255];
    red.forEach((c, j) => data[p + j] = c);
  };
  
  context.putImageData(frame, 0, 0);
};


const connect = () => {
  // maybe update the explored array to contain which vertex does the pixel belong to
  //for each pixel in the vertices array, check which vertex it is in using explored
  // then access that vertex and add new face if any face is not in there
  for (const vertex_pixel of vertices) {
    
    let row = vertex_pixel[0];
    let col = vertex_pixel[1];
    if (explored[row][col] == true) {continue};

    //console.log([row, col]);
    let vertex_num = Number(explored[row][col].substring(1));
    
    let allFaces = graph.get(vertex_num);

    for (const face of vertex_faces.get(`${row}c${col}`)) {
      if (!allFaces.has(face)) {
        allFaces.add(face);
      };
    };
  };
};

// trying with a different approach to compare results
let connections = new Map;
const connect2 = () => {
  connections.clear();
  let vertex_queue = [];
  for (let num = 1; num < v.size+1; num++) {
    connections.set(num, new Set);
    vertex_queue.push(num);
  };
  

  for (const current_vertex of vertex_queue) {
    //console.log(current_vertex); 
    let first = v.get(current_vertex)[0];
    let queue = [first];
    let j = 0;
    let checked = new Set([`${first[0]}c${first[1]}`]);

    while (j < queue.length) {
      let row = queue[j][0];
      let col = queue[j][1];
      j+=1;

      let neighbours = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
      for (const n of neighbours) {
        // coords of neighbour
        let nRow = n[0] + row;
        let nCol = n[1] + col;
        let ex = explored[nRow][nCol];

        // skip if alr checked or if part of face
        if (checked.has(`${nRow}c${nCol}`) || ex[0] == "f") {continue};
        
        // add to queue and checked if edge pixel/part of current vertex
        if (ex == true || ex == `v${current_vertex}`) {
          checked.add(`${nRow}c${nCol}`);
          queue.push([nRow, nCol]);
          continue;
        };

        // add to connections if vertex not in there
        if (!connections.get(current_vertex).has(Number(ex.slice(1)))) {
          connections.get(current_vertex).add(Number(ex.slice(1)));
        };

      };
    };
  };
};


const highlight = (str) => {
  const a = str[0] == "f" ? faces : v;
  const num = Number(str.slice(1));
  const curr = a.get(num);

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
  
  for (let i = 0; i < curr.length; i++) {
    const row = str[0] == "f" ? Number(curr[i].split("c")[0]) : curr[i][0];
    const col = str[0] == "f" ? Number(curr[i].split("c")[1]) : curr[i][1];
    
    const p = (size[0]*row + col) << 2;
    const red = [255, 0, 0, 255];
    red.forEach((c, j) => data[p + j] = c);
  };
  context.putImageData(frame, 0, 0);
};

let coords = [];
const shrink = () => {
  coords = [];
  for (let vert = 1; vert < (v.size+1); vert++) {
    let row = 0;
    let col = 0;
    for (const p of v.get(vert)) {
      row += p[0];
      col += p[1];
    };
    const len = v.get(vert).length;
    let centroid_row = Math.floor(row/len);
    let centroid_col = Math.floor(col/len);
    let queue = [];

    //coords.push([centroid_row, centroid_col]);

    
    let neighbours = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    for (const n of neighbours) {
      // coords of neighbour
      let nRow = n[0] + centroid_row;
      let nCol = n[1] + centroid_col;
      if (explored[nRow][nCol][0] == "v") {
        queue.push([nRow, nCol]);
      };
    };
    
    // all surrounding pixels are vertices
    if (queue.length == 8) {
      coords.push([centroid_row, centroid_col]);
      continue;
    };

    // no surronding pixels are vertices
    if (queue.length == 0) {
      const start_row = centroid_row-3;
      const end_row = centroid_row+3;
      const start_col = centroid_col-3;
      const end_col = centroid_col+3;
      let section = explored.slice(start_row, end_row+1).map(i => i.slice(start_col, end_col+1));
      for (const section_row of section){
        for (const p of section_row){
          if (p[0] == "v") {queue.push()};
        };
      };
    };
    
  };
};



let coord2 = [];
let others = new Map;
const shrink2 = () => {
  coord2 = [];
  /* prev method of checking largest dist
  for (let vert = 1; vert < (v.size+1); vert++) {
    let pixel = [];
    let largest_dist = 0;
    others.set(vert, []);
    for (const p of v.get(vert)) {
      const r = p[0];
      const c = p[1];
      let queue = [[r, c, 0]];
      let checked = new Set([`${r}c${c}`]);
      let i = 0;
      let d = 0;
      let found = false;

      while (!found) {
        let row = queue[i][0];
        let col = queue[i][1];
        d = queue[i][2];
        i+=1;

        let neighbours = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        for (const n of neighbours) {
          // coords of neighbour
          let nRow = n[0] + row;
          let nCol = n[1] + col;
          // if exists, check if in queue/checked already
          if (checked.has(`${nRow}c${nCol}`)){continue};

          if (pic[nRow][nCol] == 255) {
            d+=1;
            found = true;
            break;
          };

          checked.add(`${nRow}c${nCol}`);
          queue.push([nRow, nCol, d+1]);
        };
      };
      if (d > largest_dist) {
        largest_dist = d;
        pixel = [r, c];
      };
      
      if (d == largest_dist) {
        others.get(vert).push([r, c]);
      };
    };
    coord2.push(pixel);
  };
  return(coord2);
  */
  for (let vert = 1; vert < (v.size+1); vert++) {
    const middle = Math.floor((v.get(vert).length)/2);
    coord2.push(v.get(vert)[middle]);
  };
  return(coord2);
};

const show_vertices = () => {
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
  
  for (let i = 0; i < coords.length; i++) {
    const row = coords[i][0];
    const col = coords[i][1];
    
    const p = (size[0]*row + col) << 2;
    const red = [255, 0, 0, 255];
    red.forEach((c, j) => data[p + j] = c);
  };

  
  for (let vert = 1; vert < (others.size+1); vert++) {
    for (const p of others.get(vert)) {
      const row = p[0];
      const col = p[1];
    
      const pix = (size[0]*row + col) << 2;
      const red = [255, 0, 0, 255];
      red.forEach((c, j) => data[pix + j] = c);
    };
  };

  context.putImageData(frame, 0, 0);
};
