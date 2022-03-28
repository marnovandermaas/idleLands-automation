// number function
const formatNumber = (num) => {
  var num_parts = num.toString().split(".");
  num_parts[0] = num_parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return num_parts.join(".");
}
const timeConversion = (ms) => {
  let seconds = (ms / 1000).toFixed(1);
  let minutes = (ms / (1000 * 60)).toFixed(1);
  let hours = (ms / (1000 * 60 * 60)).toFixed(1);
  let days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);

  if (seconds < 60) {
    return seconds + " sec";
  } else if (minutes < 60) {
    return minutes + " min";
  } else if (hours < 24) {
    return hours + " hrs";
  } else {
    return days + " days"
  }
}

// for future use
const getMemberList = (memberHash) => {
  return _.sortBy(
    Object.keys(memberHash).map(p => ({ key: p, value: memberHash[p] })),
    p => p.key.toLowerCase()
  );
}

const triggerChange = (option, element, value) => {
  if(options[option]) {
    element.checked = value;

    var event = document.createEvent('HTMLEvents');
    event.initEvent('change', false, true);

    element.dispatchEvent(event);
  }
}

const saveOptions = (option, val) => {
  options[option] = val;
  GM_setValue('options', options);
}

const accordionElement = (el) => {
  let accordion = el.querySelector('.cb-header > .cb-accordion');
  let panel = el.querySelector('.cb-panel');
  panel.style.maxHeight = `${panel.scrollHeight}px`;

  accordion.addEventListener('click', () => {
    accordion.classList.toggle("cb-active");

    if (panel.style.maxHeight) {
        panel.style.maxHeight = null;
         panel.style.overflow = 'hidden';
      } else {
        panel.style.maxHeight = panel.scrollHeight + "px";
         panel.style.overflow = null;
      }
  });
}

const tabsNav = (element) => {

    const tabs = document.querySelectorAll(`#${element} .cb-left-pane .tabs li`);
    const sections = document.querySelectorAll(`#${element} .cb-right-pane .tab-content`);

    tabs.forEach(tab => {
      tab.addEventListener("click", e => {
        e.preventDefault();
        removeActiveTab();
        addActiveTab(tab);
      });
    })

    const removeActiveTab = () => {
      tabs.forEach(tab => {
        tab.classList.remove("active");
      });
      sections.forEach(section => {
        section.classList.remove("active");
      });
    }

    const addActiveTab = tab => {
      tab.classList.add("active");
      const data = tab.dataset.tab;
      const matchingSection = document.querySelector(`#${data}`);
      matchingSection.classList.add("active");
    }
}

// Draggable
  function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(elmnt.id + "-header")) {
      // if present, the header is where you move the DIV from:
      document.getElementById(elmnt.id + "-header").onmousedown = dragMouseDown;
    } else {
      // otherwise, move the DIV from anywhere inside the DIV:
      elmnt.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      // get the mouse cursor position at startup:
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      // call a function whenever the cursor moves:
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      // calculate the new cursor position:
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      // set the element's new position:
      elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
      elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
      // stop moving when mouse button is released:
      document.onmouseup = null;
      document.onmousemove = null;
    }
}

Array.prototype.findPath = function (path) {
    let prospect = this.filter(obj => obj.path === path);
    if (prospect[0] !== undefined) return prospect[0].value;
    else return undefined;
}

// given a string, return an array of objects
// given an array, return a formatted string
const formatDdList = (given) => {
    // if it is not an array
    if (!Array.isArray(given)) {
        // remove all spaces except newline
        let noSpaces = given.replace(/ +?/g, '');
        // make an array of strings like ['1,2','3,4','5,6']
        let arr = noSpaces.split('\n');
        // return formatted array of objects
        let objs = arr.map(e => {
            let [x, y] = e.split(',').map(e => parseInt(e));
            if (!isNaN(x) && !isNaN(y)) {
                return {
                    x,
                    y
                }
            }
        })
        return objs.filter(e => e !== undefined);
    } else {
        let strings = given.map(e => `${e.x},${e.y}`);
        return strings.join('\n');
    }
}
