// ==UserScript==
// @name         IdleLands Automation Script
// @namespace    http://tampermonkey.net/
// @version      0.1.0
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
  guildRaidMinLevel: 1150,
  guildRaidMaxLevel: 1300,
  guildRaidItems: ['item:Crystal:Yellow','item:generated:goatly','item:generated:godly'],

  petAdventureCollectInterval: 1, // in minutes
  petAdventureEmbarkInterval: 1, // in minutes
  petAdventureTimeOut: 1000, // in milliseconds
  petAdventurePetNum: 3, // Number of pets to send per adventure (Game max is set to 3)

  petGoldCollectInterval: 5 // in minutes
}

const globalData = {
  nextRaidAvailability: 0,
  canGuildRaid: false,
  petAutoAscend: false

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
      globalData.canGuildRaid = true;
  }

  load();
})();

const load = () => {
  document.body.insertAdjacentHTML("beforeend", `
  <div id="cb-container">

    <div id="cb-header">
      <span id="cb-title">IdleLands Scripts</span>
      <button class="cb-accordion cb-active"></button>
    </div>
    <div class="cb-panel">

    <div class="cb-section-header">Pets - Adventures</div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="flex">Auto Collect</span>
        <span class="flex right">
          <label class="switch">
            <input id="pet-adventure-collect-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </span>
      </div>
    </div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="flex">Auto Embark</span>
        <span class="flex right">
          <label class="switch">
            <input id="pet-adventure-embark-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </span>
      </div>
    </div>
    <div class="cb-section-header">Active Pet ( <span id="cb-pet-type"></span> - <span id="cb-pet-levels"></span> )</div>
    <div class="cb-section">
      <div class="cb-section-content">
        <div class="flex">Auto Gold Collect</div>
        <div class="flex right">
          <label class="switch">
            <input id="pet-gold-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </div>
      </div>
    </div>
    <div class="cb-section">
      <div class="cb-section-content">
        <div class="flex">Auto Ascend</div>
        <div class="flex right">
          <label class="switch">
            <input id="pet-ascend-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </div>
      </div>
    </div>
    <div class="cb-sub-section">
      <div class="cb-section-content">
        <div class="flex small"><span id="pet-ascend-message">Not enabled!</span></div>
      </div>
    </div>
    <div class="cb-section-header">Raids</div>
    ${
    globalData.canGuildRaid
    ? `
    <div class="cb-section">
      <div class="cb-section-content">
        <div class="flex">Auto Raid</div>
        <div class="flex right">
          <label class="switch">
            <input id="raids-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </div>
      </div>
    </div>
    <div class="cb-sub-section">
      <div class="cb-section-content">
        <div class="flex small">Next Raid @ <span id="guild-next-time">-</span></div>
        <div class="break"></div>
        <div class="flex small">Level: <span id="guild-level">-</span></div>
        <div class="break"></div>
        <div class="flex small">Reward: <span id="guild-item">-</span></div>
      </div>
    </div>`
    : `
    <div class="cb-sub-section">
      <div class="cb-section-content">
        <div class="flex small">You need to be a guild Leader or Mod to use this feature.</span></div>
      </div>
    </div>`
    }
    <div id="cb-footer">by: Torsin - Source / Contributors on <a href="https://github.com/the-crazyball/idleLands-automation" target="_blank">GitHub</a></div>

    </div>
  </div>
  ` );

  const petDataLoop = setInterval( () => {
    displayActivePetLevels();
    displayActivePetType();

    if(globalData.petAutoAscend) petAscend();
  }, 1000);

  // Event listeners

  var petAdventureCollectLoop;
  document.getElementById("pet-adventure-collect-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          petAdventureCollectLoop = setInterval( claimAdventures, 1000*60*options.petAdventureCollectInterval );
          console.log('pet adventures collect started');
      } else {
          clearInterval(petAdventureCollectLoop);
          console.log('pet adventures collect stopped');
      }
  });

  var petAdventureEmbarkLoop;
  document.getElementById("pet-adventure-embark-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          petAdventureEmbarkLoop = setInterval( embarkAdventures, 1000*60*options.petAdventureEmbarkInterval );
          console.log('pet adventures embark started');
      } else {
          clearInterval(petAdventureEmbarkLoop);
          console.log('pet adventures embark stopped');
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

  document.getElementById("pet-ascend-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          globalData.petAutoAscend = true;
          console.log('pet auto ascend started');
      } else {
          globalData.petAutoAscend = false;
          document.getElementById("pet-ascend-message").innerHTML = 'Not enabled!';
          console.log('pet auto ascend stopped');
      }
  });

  if(globalData.canGuildRaid) {
    const guildTimeEl = document.getElementById("guild-next-time");
    const guildLevelEl = document.getElementById("guild-level");
    const guildItemEl = document.getElementById("guild-item");

    var raidsLoop;
    document.getElementById("raids-checkbox").addEventListener( 'change', async function() {
          if(this.checked) {
              raidsLoop = setInterval( RunRaids, 1000*30 ); // 30 seconds for now
              console.log('raiding started');

              let guildResponse = await fetch('https://server.idle.land/api/guilds/name?name=' + discordGlobalCharacter.guildName);
              let guildData = await guildResponse.json();

              globalData.nextRaidAvailability = guildData.guild.nextRaidAvailability;
              var date = new Date(globalData.nextRaidAvailability);
              guildTimeEl.innerHTML = date.toLocaleTimeString(); //("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2) + ":" + ("0" + date.getSeconds()).slice(-2);
          } else {
              clearInterval(raidsLoop);
              console.log('raiding stopped');
              guildTimeEl.innerHTML = '-';
              guildLevelEl.innerHTML = '-';
              guildItemEl.innerHTML = '-';
          }
    });
  }

  // Make the whole container draggable
  dragElement(document.getElementById("cb-container"));

  // Accordion
  var acc = document.getElementsByClassName("cb-accordion");
  var panel = document.getElementsByClassName("cb-panel");
  panel[0].style.maxHeight = panel[0].scrollHeight + "px";

    acc[0].addEventListener("click", function() {
      this.classList.toggle("cb-active");
      var panel = document.getElementsByClassName("cb-panel");
      if (panel[0].style.maxHeight) {
        panel[0].style.maxHeight = null;
         panel[0].style.overflow = 'hidden';
      } else {
        panel[0].style.maxHeight = panel[0].scrollHeight + "px";
         panel[0].style.overflow = null;
      }
    });

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

  // Pet ascend
  const petAscend = () => {

    let pet = discordGlobalCharacter.$petsData.allPets[discordGlobalCharacter.$petsData.currentPet];

    if(pet.level.maximum != pet.level.__current) {
        document.getElementById("pet-ascend-message").innerHTML = 'Ah, the waiting game for max level to be reached!';
        return false;
    }
    if(pet.rating >= 5) {
        document.getElementById("pet-ascend-message").innerHTML = `This pet has reached it's maximum level capacity, this is a good thing! Try maxing out other pets.`;
        return false;
    }

    let someMaterialsMissing = Object.keys(pet.$ascMaterials).some((mat) => pet.$ascMaterials[mat] > (discordGlobalCharacter.$petsData[mat] || 0))
    if(someMaterialsMissing) {
        document.getElementById("pet-ascend-message").innerHTML = 'Oops, you are missing materials';
        return false;
    }

    console.log('Pet ascended');
    setTimeout(function(){unsafeWindow.__emitSocket("pet:ascend")}, 500);
  }

  // Pet adventures
  const claimAdventures = () => {

      // get expired adventures and claim
      let adventuresFinished = Object.values(discordGlobalCharacter.$petsData.adventures).filter(x => (x.finishAt <= Date.now()) && x.finishAt != 0);

      if (adventuresFinished.length) {
        for (let i = 0; i < adventuresFinished.length; i++) {
          let currentAdventure = adventuresFinished[i];

          setTimeout(function(){
            unsafeWindow.__emitSocket("pet:adventure:finish", { adventureId: currentAdventure.id }); // Collect
          }, options.petAdventureTimeOut * i);
        }
      }
  }
  const embarkAdventures = () => {

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
      }
  }

  // Raids
  const RunRaids = async () => {

    if(globalData.nextRaidAvailability <= Date.now()) {
        console.log('raid initiated');
        let level = 0;
        let reward = '';

        let response = await fetch('https://server.idle.land/api/guilds/raids?maxLevel=' + options.guildRaidMaxLevel);
        let data = await response.json();

        let results = data.raids.filter(element => {
            return element.rewards.some(r => options.guildRaidItems.includes(r)) && (element.level >= options.guildRaidMinLevel && element.level <= options.guildRaidMaxLevel);
        });

        if (results.length > 0) {
            level = results[results.length-1].level;
            reward = results[results.length-1].rewards[0];
        } else {
            level = options.guildRaidMaxLevel;
            reward = data.raids[data.raids.length-1].rewards[0];
        }

        setTimeout(function(){unsafeWindow.__emitSocket("guild:raidboss", { bossLevel: level})}, 2000);

        // need to get the actual next raid time from the server after the raid completion
        setTimeout(async function() {
            let guildResponse = await fetch('https://server.idle.land/api/guilds/name?name=' + discordGlobalCharacter.guildName);
            let guildData = await guildResponse.json();
            var date = new Date(guildData.guild.nextRaidAvailability);

            globalData.nextRaidAvailability = guildData.guild.nextRaidAvailability;

            guildTimeEl.innerHTML = date.toLocaleTimeString(); //("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2) + ":" + ("0" + date.getSeconds()).slice(-2);
            guildLevelEl.innerHTML = level;
            guildItemEl.innerHTML = reward;
        }, 10000); // added 5 seconds extra from the 5 seconds for the combat to initiate
    }
  }

  const PetGoldCollect = () => {
    setTimeout(function(){unsafeWindow.__emitSocket("pet:takegold")}, 500);
  }
}
const displayActivePetType = () => {
  document.getElementById("cb-pet-type").innerHTML = discordGlobalCharacter.$petsData.currentPet;
}
const displayActivePetLevels = () => {
  document.getElementById("cb-pet-levels").innerHTML = discordGlobalCharacter.$petsData.allPets[discordGlobalCharacter.$petsData.currentPet].level.__current + '/' + discordGlobalCharacter.$petsData.allPets[discordGlobalCharacter.$petsData.currentPet].level.maximum;
}

