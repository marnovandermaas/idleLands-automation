// ==UserScript==
// @name         IdleLands Automation Script
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  A collection of automation scripts for IdleLands
// @downloadURL  https://raw.githubusercontent.com/the-crazyball/idleLands-automation/main/thescript.js
// @updateURL    https://raw.githubusercontent.com/the-crazyball/idleLands-automation/main/thescript.meta.js
// @author       Ian Duchesne (Torsin aka Crazyball)
// @match        https://play.idle.land/*
// @resource css https://raw.githubusercontent.com/the-crazyball/idleLands-automation/main/style.css
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

var cssTxt = GM_getResourceText("css");
GM_addStyle (cssTxt);

const options = {
  raidButtonStatus: 'disabled', // add this here for convenience.

  guildRaidInterval: 55, // in minutes
  guildRaidMinLevel: 1000,
  guildRaidMaxLevel: 1150,
  guildRaidItems: ['item:Crystal:Yellow','item:generated:goatly','item:generated:godly'],

  petAdventureInterval: 10, // in minutes
  petAdventureTimeOut: 1000, // in milliseconds
  petAdventurePetNum: 3, // Number of pets to send per adventure (Game max is set to 3)

  petGoldCollectInterval: 5 // in minutes
}

const loginCheck = () => {
  return new Promise(function (resolve, reject) {

    const loginCheckLoop = setInterval( () => {
        if( typeof discordGlobalCharacter === 'object' ) {
            clearInterval(loginCheckLoop);
            resolve();
        }
    }, 100);

  });
}

(async () => {
  await loginCheck();

  let guildResponse = await fetch('https://server.idle.land/api/guilds/name?name=' + discordGlobalCharacter.guildName);
  let guildData = await guildResponse.json();
  let guildMod = Object.values(guildData.guild.members).filter(x => x.name == discordGlobalCharacter.name && x.rank >= 5)

  if(guildMod.length) {
      options.raidButtonStatus = '';
  }

  load();
})();

const load = () => {
  document.body.insertAdjacentHTML("beforeend", `
  <div id="cb-container">
    <div id="cb-header">Automation Scripts</div>
    <div class="cb-panel">
      <div class="cb-panel-content">
        <span class="flex">Pet Adventures</span>
        <span class="flex right">
          <label class="switch">
            <input id="pet-adventure-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </span>
      </div>
    </div>

    <div class="cb-panel">
      <div class="cb-panel-content">
        <div class="flex">Pet Gold Collect</div>
        <div class="flex right">
          <label class="switch">
            <input id="pet-gold-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="cb-panel">
      <div class="cb-panel-content">
        <div class="flex">Raids</div>
        <div class="flex right">
          <label class="switch">
            <input id="raids-checkbox" type="checkbox" ${options.raidButtonStatus}>
            <span class="slider round"></span>
          </label>
        </div>
        <div class="break"></div>
        <div class="flex small">Next Raid: <span id="guild-next-time"></span></div>
        <div class="break"></div>
        <div class="flex small">Level: <span id="guild-level"></span></div>
        <div class="break"></div>
        <div class="flex small">Item: <span id="guild-item"></span></div>
      </div>
    </div>
    <div id="cb-footer">By: Torsin - <a href="https://github.com/the-crazyball/idleLands-automation" target="_blank">GitHub</a></div>
  </div>
  ` );

  const guildTimeEl = document.getElementById("guild-next-time");
  const guildLevelEl = document.getElementById("guild-level");
  const guildItemEl = document.getElementById("guild-item");
  guildTimeEl.innerHTML = '-';
  guildLevelEl.innerHTML = '-';
  guildItemEl.innerHTML = '-';

  // Event listeners

  var petAdventureLoop;
  document.getElementById("pet-adventure-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          petAdventureLoop = setInterval( RunAdventures, 1000*60*options.petAdventureInterval );
          console.log('pet adventures started');
      } else {
          clearInterval(petAdventureLoop);
          console.log('pet adventures stopped');
      }
  });

  var petGoldCollectLoop;
  document.getElementById("pet-gold-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          petGoldCollectLoop = setInterval( PetGoldCollect, 1000*60*options.petGoldCollectInterval );
          console.log('pet gold collection started');
      } else {
          clearInterval(petGoldCollectLoop);
          console.log('pet gold collection stopped');
      }
  });

  var raidsLoop;
  document.getElementById("raids-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          raidsLoop = setInterval( RunRaids, 1000*60*options.guildRaidInterval );
          console.log('raiding started');

          let date = new Date();
          date.setMinutes(date.getMinutes()+options.guildRaidInterval);
          guildTimeEl.innerHTML = ("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2);
      } else {
          clearInterval(raidsLoop);
          console.log('raiding stopped');
          guildTimeEl.innerHTML = '-';
          guildLevelEl.innerHTML = '-';
          guildItemEl.innerHTML = '-';
      }
  });

  // Make the whole container draggable
  dragElement(document.getElementById("cb-container"));

  // Accordion
  var acc = document.getElementsByClassName("accordion");
  var i;

  for (i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", function() {
      this.classList.toggle("active");
      var panel = this.nextElementSibling;
      if (panel.style.maxHeight) {
        panel.style.maxHeight = null;
      } else {
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
    });
  }

  // Draggable
  function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(elmnt.id + "header")) {
      // if present, the header is where you move the DIV from:
      document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
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

  // Pet adventures
  const claimAdventures = () => {
    return new Promise(function (resolve, reject) {
      // get expired adventures and claim
      let adventuresFinished = Object.values(discordGlobalCharacter.$petsData.adventures).filter(x => (x.finishAt <= Date.now()) && x.finishAt != 0);

      if (adventuresFinished.length) {
        for (let i = 0; i < adventuresFinished.length; i++) {
          let currentAdventure = adventuresFinished[i];

          setTimeout(function(){
            unsafeWindow.__emitSocket("pet:adventure:finish", { adventureId: currentAdventure.id }); // Collect
            resolve();
          }, options.petAdventureTimeOut * i);
        }
        setTimeout(function(){resolve()}, options.petAdventureTimeOut * adventuresFinished.length + 2000); // add 2 seconds
      } else {
        resolve();
      }
    });
  }
  const embarkAdventrues = () => {
    //console.log('embarking');
    return new Promise(function (resolve, reject) {
      // assign pets to adventures
      let adventuresNotStarted = Object.values(discordGlobalCharacter.$petsData.adventures).filter(x => !x.finishAt);

      if (adventuresNotStarted.length) {
        for (let i = 0; i < adventuresNotStarted.length; i++) {
          let currentAdventure = adventuresNotStarted[i];

          setTimeout(function(){
            let pets = discordGlobalCharacter.$petsData.allPets;
            let petsTemp = [];

            let filter = Object.entries(pets).reduce((acc, [key, value]) => {
              if (!value.currentAdventureId) return [...acc, key];
              return acc;
            }, [])

            if (filter.length) {
              let maxPets = filter.length > options.petAdventurePetNum ? options.petAdventurePetNum : filter.length;
              for (let i = 0; i < maxPets; i++) {
                petsTemp.push(filter[i]);
              }
              unsafeWindow.__emitSocket("pet:adventure:embark", { adventureId: currentAdventure.id, petIds: petsTemp });
            }
          }, options.petAdventureTimeOut * i);
        }
        setTimeout(function(){resolve()}, options.petAdventureTimeOut * adventuresNotStarted.length + 2000); // add 2 seconds
      } else {
        resolve();
      }
    });
  }
  const RunAdventures = async () => {
    await claimAdventures();
    await embarkAdventrues();
  }

  // Raids
  const RunRaids = async () => {
    let level = 0;

    let response = await fetch('https://server.idle.land/api/guilds/raids?maxLevel=' + options.guildRaidMaxLevel);
    let data = await response.json();
    let date = new Date();

    date.setMinutes(date.getMinutes()+options.guildRaidInterval);

    let results = data.raids.filter(element => {
      return element.rewards.some(r => options.guildRaidItems.includes(r)) && (element.level >= options.guildRaidMinLevel && element.level <= options.guildRaidMaxLevel);
    });

    if (results.length > 0) {
      level = results[results.length-1].level;
    } else {
      level = options.guildRaidMaxLevel;
    }

    setTimeout(function(){unsafeWindow.__emitSocket("guild:raidboss", { bossLevel: level})}, 2000);

    guildTimeEl.innerHTML = ("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2);
    guildLevelEl.innerHTML = level;
    guildItemEl.innerHTML = results[results.length-1].rewards[0];
  }

  const PetGoldCollect = () => {
    setTimeout(function(){unsafeWindow.__emitSocket("pet:takegold")}, 500);
  }
}


