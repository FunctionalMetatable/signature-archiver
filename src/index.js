const fetch = require("node-fetch")
const fs = require("fs")
const { parseHTML } = require("linkedom");
const prettier = require("prettier")

let users = JSON.parse(fs.readFileSync("./users.json", "utf-8"))

let forceUsePost = {
  "Raihan142857": 5154718,
  "9gr": 5530031,
  "ninjaMAR": 4080205,
  "nampinanathali": 3049838,
  "Ankit_Anmol": 5207259,
  "Sheep_maker": 3460004,
  "hello_smile": 323780,
  "CST1229": 5181933,
  "dhuls": 5530038
}
async function run() {
  for (let u=0;u<users.length;u++) {
    let user = users[u];
    let id = 0;
    if (forceUsePost[user]) {
      id = forceUsePost[user]
    } else {
      let res = await fetch(`https://scratchdb.lefty.one/v3/forum/user/posts/${user}/0`).then(res => res.json()).catch(err => console.log("ScratchDB Fetch Error:" + err))
      if (res.error) continue
      let post = typeof res == 'array' ? res[0] : { id: 0 }
      id = post.id
    }
    
    let postRes = await fetch(`https://scratch.mit.edu/discuss/post/${id}`, { headers: { "User-Agent": "Mozilla 5.0" } }).then(res => res.text());
    
    let { window, document } = parseHTML(postRes);
    
    let signature = document.querySelector(`#p${id}`)
    
    if (!signature) continue
    if (signature) signature = signature.querySelector(".postsignature")
    
    let bbcode = htmlToBBCode(signature ? signature.innerHTML : "").trim();
    
    let old
    try {
      old = [ fs.readFileSync(`./signatures/${user}/signature.txt`, "utf-8"), fs.readFileSync(`./signatures/${user}/signature.html`, "utf-8") ]
    } catch(ex) {
      fs.mkdirSync(`./signatures/${user}`)
    }
    
    try {
      fs.readFileSync(`./signatures/${user}.txt`)
      console.log(`${user} ~ Migrating..`)
      // Migrate the user
      fs.unlinkSync(`./signatures/${user}.txt`)
      fs.unlinkSync(`./signatures/${user}.html`)
      console.log(`${user} ~ Migrated [Success]`)
    } catch(ex) {
      console.log(`${user} ~ Already migrated`)
    }
    
    let formattedHTML = prettier.format(signature ? signature.innerHTML : "", { semi: false, parser: 'html'})
    if (old !== [bbcode, formattedHTML]) {
      fs.writeFileSync(`./signatures/${user}/signature.txt`, bbcode)
      fs.writeFileSync(`./signatures/${user}/signature.html`, formattedHTML)
      console.log(`${user} ~ Updated signature`)
    }
  }
};

function htmlToBBCode(signatureHtml) {    
    let { window, document } = parseHTML(`<div class="postsignature">${signatureHtml}</div>`)
    
    let html = document.querySelector(".postsignature")

    // new lines
    let lineBreaks = html.querySelectorAll("br");
    for (let br of lineBreaks) br.insertAdjacentText("afterend", "\n");

    // images and smileys
    let smilieReplaces = Object.assign(Object.create(null), {
      smile: ":)",
      neutral: ":|",
      sad: ":(",
      big_smile: ":D",
      yikes: ":o",
      wink: ";)",
      hmm: ":/",
      tongue: ":P",
      lol: ":lol:",
      mad: ":mad:",
      roll: ":rolleyes",
      cool: ":cool:",
    });

    let imgs = html.querySelectorAll("img");
    for (let img of imgs) {
      if (
        /\/\/cdn\.scratch\.mit\.edu\/scratchr2\/static\/__[a-z0-9]{32}__\/djangobb_forum\/img\/smilies\/[a-z_]{3,9}\.png/.test(
          img.src
        )
      ) {
        if (smilieReplaces[img.src.split("smilies/")[1].split(".")[0]]) {
          img.parentNode.insertBefore(
            document.createTextNode(smilieReplaces[img.src.split("smilies/")[1].split(".")[0]]),
            img
          );
        } else img.parentNode.insertBefore(document.createTextNode(`[img${img.src}[/img]`), img);
      } else img.parentNode.insertBefore(document.createTextNode(`[img]${img.src}[/img]`), img);
    }

    // bold, italic, underline, strikethrough, big, small and color
    let bbReplaces = {
      italic: "i",
      bold: "b",
      big: "big",
      small: "small",
      underline: "u",
      strikethrough: "s",
    };
    let spans = html.querySelectorAll("span");
    for (let span of spans) {
      if (span.className.startsWith("bb-")) {
        span.insertAdjacentText("afterbegin", `[${bbReplaces[span.className.slice(3)]}]`);
        span.insertAdjacentText("beforeend", `[/${bbReplaces[span.className.slice(3)]}]`);
      } else if (span.style.color) {
        let color = span.style.color;

        function componentToHex(c) {
          var hex = c.toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        }

        function rgbToHex(r, g, b) {
          return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
        }

        if (color.startsWith("rgb")) {
          let rgbValues = color
            .slice(4, color.length - 1)
            .split(/, ?/)
            .map((x) => Number(x));

          span.insertAdjacentText("afterbegin", `[color=${rgbToHex(...rgbValues).toUpperCase()}]`);
        } else span.insertAdjacentText("afterbegin", `[color=${color}]`);
        span.insertAdjacentText("beforeend", "[/color]");
      }
    }

    // links
    // todo: try and gues where dictionary/wiki/wp etc. tags are being used?
    let links = html.querySelectorAll("a");
    for (let link of links) {
      link.insertAdjacentText("afterbegin", `[url=${link.href}]`);
      link.insertAdjacentText("beforeend", "[/url]");
    }

    // center
    let divs = html.querySelectorAll("div");
    for (let div of divs) {
      if (div.style.textAlign === "center") {
        div.insertAdjacentText("afterbegin", "[center]");
        div.insertAdjacentText("beforeend", "[/center]");
      }
    }

    // lists
    let lis = html.querySelectorAll("li");
    for (let li of lis) li.textContent = `[*]${li.textContent}`;
    let uls = html.querySelectorAll("ul");
    for (let ul of uls) ul.textContent = `[list]\n${ul.textContent}[/list]\n`;
    let ols = html.querySelectorAll("ol");
    for (let ol of ols) ol.textContent = `[list=1]\n${ol.textContent}[/list]\n`;

    // scratchblocks
    let scratchBlocksPres = html.getElementsByClassName("blocks");
    for (let pre of scratchBlocksPres) {
      pre.textContent = `[scratchblocks]\n${pre.textContent}\n[/scratchblocks]`;
    }

    // code blocks
    let codeBlocks = html.querySelectorAll("div.code");
    for (let codeBlock of codeBlocks) codeBlock.textContent = `[code]\n${codeBlock.textContent}[/code]\n`;

    // quotes
    let quotes = html.querySelectorAll("blockquote");
    for (let quote of quotes) {
      let author = quote.querySelector("p.bb-quote-author");
      if (author)
        quote.textContent = `[quote=${author.textContent.slice(0, author.textContent.length - 7)}]\n${
          quote.textContent
        }[/quote]\n`;
      else quote.textContent = `[quote]\n${quote.textContent}[/quote]\n`;
    }

    return html.textContent;
  }
  
run()
