window.onload = () => {
    const input = document.getElementById("input");
    input.onchange = () => {
      const img = document.createElement("img");
      document.body.append(img);
      img.onload = () => {
        process_img(img);
        loopImage(matrix);
        show();
      };
      img.src = URL.createObjectURL(input.files[0]);
    };
  };
  
  let pic = []; 
  let size = []; // stores size of image for easy ref
  let matrix = [0, 20, 0, 20]; // xstart, xend, ystart, yend
  let possible = [];
  
  const process_img = (img) => {
      const w = 400;
      const h = Math.floor(w*img.height/img.width);
      size = [w, h];
      const canvas = document.createElement("canvas");
      document.body.append(canvas);
      for (const el of [img, canvas]) {
          el.width = w;
          el.height = h;
          el.style.margin = "2px";
      }
      const context = canvas.getContext("2d");
      context.drawImage(img, 0, 0, w, h);
      const frame = context.getImageData(0, 0, w, h);
      const data = frame.data;
      canvas.setAttribute("id", "original");
      
      for (let y = 0; y < h; ++y) {
        
          pic[y] = [];
        
          for (let x = 0; x < w; ++x) {
              // turns the image into black and white
              const i = (w*y + x) << 2;
              const [r, g, b, a] = [0, 1, 2, 3].map(j => data[i + j]);
              const v = Math.floor((r + g + b)/3);
              const color = [v, v, v, 255];
              color.forEach((c, j) => data[i + j] = c);
              pic[y].push(v); //add pixel to data array
          }
      }
      
      // arr = Array.from(data); //255 white, 0 black
      context.putImageData(frame, 0, 0);
  };
  
  
  const loopImage = (m) => {
    for (let i = 0; i < (size[1]-10); i+=10) {
      for (let j = 0; j < 390; j+=10) {
        [m[2], m[3]] = [m[2]+10, m[3]+10]; // increment ys and ye
        let sq = pic.slice(m[0], m[1]).map(i => i.slice(m[2], m[3]));
        if (checkSquare(sq) > 2) {
          let copy = m.slice();
          possible.push(copy);
        };
        // console.log(m);
      };
      
      [m[2], m[3]] = [-10, 10]; // reset ystart and yend
      m[0] += 10; // increment xstart
      
      // increment xend by less than 10 if close to end
      if (size[1] - m[1] < 10) {
        m[1] += (size[1]-m[1]);
        continue;
      };
      m[1] += 10; // increment xend
      
    };
  };
  
  
  const checkSquare = (square) => {
    let borders = [];
    let n = 0;
    let prev_pixel = false;
    let rows = square.length;
    let cols = square[0].length;
    
    // push the pixels belonging to the borders of the square
    square[0].forEach((c) => borders.push(c));
    for (let i = 1; i < (rows - 2); i++) {
      borders.push(square[i][cols - 1]);
    }
    square[rows-1].forEach((c) => borders.push(c));
    for (let i = (rows - 2); i > 0; i--) {
      borders.push(square[i][0]);
    }
    
    for (let i = 0; i < borders.length; i++) {
      // current pixel is white
      if (borders[i] > 127) {
        prev_pixel = false;
        continue;
      }
      
      // current pixel is black and prev pixel is not black
      if (prev_pixel == false) {
        n += 1;
        prev_pixel = true;
        continue;
      }
      
      // current pixel is black and prev pixel is black
      if (prev_pixel == true) { continue; }
    }
    return n;
  };
  
  
  const show = () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    canvas.width = size[0];
    canvas.height = size[1];
    canvas.style.margin = "2px";
    
    const context = canvas.getContext("2d");
    const orig = document.getElementById("original");
    context.drawImage(orig, 0, 0);
    
    const frame = context.getImageData(0, 0, size[0], size[1]);
    const data = frame.data;
    
    for (let i = 0; i < possible.length; i++) {
      let currSquare = possible[i];
      for (let x = currSquare[0]; x < currSquare[1]; x++) {
        for (let y = currSquare[2]; y < currSquare[3]; y++) {
          const i = (size[0]*y + x) << 2;
          if (data[i] < 127) { continue; }; //skip if dark colored pixel
          
          let [r, g, b, a] = [0, 1, 2, 3].map(j => data[i + j]);
          // if pixel is already orange
          if ([r, g, b] == [255, 165, 0]) {
            data[i+3] += 50;
            continue;
          };
          
          // if pixel is not orange
          const orange = [255, 165, 0, 100];
          orange.forEach((c, j) => data[i + j] = c);
          
        };
      };
    };
   
    context.putImageData(frame, 0, 0);
  };
  