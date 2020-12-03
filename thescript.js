// ==UserScript==
// @name         IdleLands Automation Script
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  A collection of automation scripts for IdleLands
// @downloadURL  https://raw.githubusercontent.com/the-crazyball/idleLands-automation/main/thescript.js
// @updateURL    https://raw.githubusercontent.com/the-crazyball/idleLands-automation/main/thescript.meta.js
// @author       Ian Duchesne (Torsin aka Crazyball)
// @match        https://play.idle.land/*
// @require      https://raw.githubusercontent.com/the-crazyball/idleLands-automation/main/gameData.js
// @require      https://raw.githubusercontent.com/lodash/lodash/4.17.20/dist/lodash.js
// @resource css https://raw.githubusercontent.com/the-crazyball/idleLands-automation/main/style.css
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

var cssTxt = GM_getResourceText("css");
GM_addStyle (cssTxt);

/* TODO:
  - choices selection
  - guild chat?
  - enforce personalities
  - salvage all/sell all
  - invite to guild / new users
  - seperate code in different JS files
  - auto collect global quest
  - add DivineStumbler
*/

let defaultOptions = {
  guildRaidMinLevel: 100,
  guildRaidMaxLevel: 100,
  guildRaidItems: ['item:Crystal:Yellow','item:generated:goatly',''],
  guildRaidNextAvailability: 0,

  petAdventureCollectInterval: 60000, // in ms
  petAdventureEmbarkInterval: 60000, // in ms
  petAdventurePetNum: 3, // Number of pets to send per adventure (Game max is set to 3)

  petGoldCollectInterval: 300000, // in ms
  petAutoAscendInterval: 60000, // in ms

  donateGoldInterval: 3600000, // in ms

  guildRaidInterval: 30000, // 30 secs, in ms

  useScrollsInterval: 60000,

  optimizeEquipmentInterval: 60000, // in ms
  optimizeEquipmentStat: 'gold', // gold or xp

  // checkboxes
  optimizeEquipment: false,
  petAdventureCollect: false,
  petAdventureEmbark: false,
  petGoldCollect: false,
  freeRoll: false,
  useScrolls: false,
  donateGold: false,
  petAutoAscend: false,
  raids: false
}

const options = GM_getValue('options') == null ? defaultOptions : GM_getValue('options'); //save and persist options to the local storage

const globalData = {
  canGuildRaid: false,
  raidFail: false,
  lastRaidBossLevel: 0
}

const loginCheck = () => {
  return new Promise((resolve, reject) => {
    const loginCheckLoop = setInterval( () => {
        // check for discordGlobalCharacter object and if we are passed login page
        // (there are instances where the player object is loaded but stays on the login screen and errors out)
        if( typeof discordGlobalCharacter === 'object' && document.querySelector('.ion-margin-bottom > ion-list:nth-child(1)') !== null) {
            clearInterval(loginCheckLoop);
            resolve();
        }
    }, 100);
  });
}

const guildModCheck = async () => {
  if(discordGlobalCharacter.guildName) {
    let guild = await getGuildData();
    globalData.canGuildRaid = Object.values(guild.members).filter(x => x.name == discordGlobalCharacter.name && x.rank >= 5).length > 0
  }
}

(async () => {
  await loginCheck();
  await guildModCheck();

  loadUI();
  start();
})();

const getGuildRaidMaxLevel = async () => {
 let guild = await getGuildData();
 return 100 + ((guild.buildingLevels['active:raidportal'] - 1) * 50);
}

const buildMinRaidOptions = async () => {
  let values = '';
  let maxLevel = await getGuildRaidMaxLevel();
  for(let i = 100; i <= maxLevel; i += 50) {
    values += `<option value="${i}" ${options.guildRaidMinLevel == i ? 'selected' : ''}>${i}</option>`
  }
  return values;
}

const buildMaxRaidOptions = async () => {
  let values = '';
  let maxLevel = await getGuildRaidMaxLevel();

  for(let i = 100; i <= maxLevel; i += 50) {
    values += `<option value="${i}" ${options.guildRaidMaxLevel == i ? 'selected' : ''}>${i}</option>`
  }
  return values;
}

const buildRaidItemOptions = (slot) => {
  let values = `<option value=""></option>`;

  Object.keys(raidRewards).forEach(key => {
    values += `<option value="${key}" ${options.guildRaidItems[slot] == key ? 'selected' : ''}>${raidRewards[key]}</option>`
  });
  return values;
}

const loadUI = () => {
  document.body.insertAdjacentHTML("beforeend", `
  <div id="cb-settings-container" class="cb-hide">
    <div id="cb-settings-container-header" class="cb-header">
      <span id="cb-title" class="text-border-light">Settings</span>
      <button id="cb-settings-close" class="cb-close"></button>
    </div>
    <div class="cb-section-header">General</div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="cb-flex-1">Optimize Equipment:</span>
        <span class="cb-flex-1 right">
          <select class="cb-select" id="cb-optimize-equipment-select">
            <option value="gold" ${options.optimizeEquipmentStat == 'gold' ? `selected` : ``}>gold</option>
            <option value="xp" ${options.optimizeEquipmentStat == 'xp' ? `selected` : ``}>xp</option>
          </select>
        </span>
      </div>
    </div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="cb-flex-1">Pets per Adventure:</span>
        <span class="cb-flex-1 right">
          <select class="cb-select" id="cb-pets-per-select">
            <option value="1" ${options.petAdventurePetNum == 1 ? `selected` : ``}>1</option>
            <option value="2" ${options.petAdventurePetNum == 2 ? `selected` : ``}>2</option>
            <option value="3" ${options.petAdventurePetNum == 3 ? `selected` : ``}>3</option>
          </select>
        </span>
      </div>
    </div>
    <div class="cb-section-header">Intervals ( in ms )</div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="cb-flex-1">Pets Adventures Collect:</span>
        <span class="right">
          <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-pet-adventure-collect-text">
        </span>
      </div>
    </div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="cb-flex-1">Pets Adventures Embark:</span>
        <span class="right">
          <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-pet-adventure-embark-text">
        </span>
      </div>
    </div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="cb-flex-1">Pet Gold Collect:</span>
        <span class="right">
          <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-pet-gold-collect-text">
        </span>
      </div>
    </div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="cb-flex-1">Pet Auto Ascent:</span>
        <span class="right">
          <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-pet-auto-ascend-text">
        </span>
      </div>
    </div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="cb-flex-1">Donate Gold:</span>
        <span class="right">
          <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-donate-gold-text">
        </span>
      </div>
    </div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="cb-flex-1">Optimize Equipment:</span>
        <span class="right">
          <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-optimize-equipment-text">
        </span>
      </div>
    </div>
    <div class="cb-section" id="cb-guild-raid-interval-section">
      <div class="cb-section-content">
        <span class="cb-flex-1">Guild Raid:</span>
        <span class="right">
          <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-guild-raid-text">
        </span>
      </div>
    </div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="cb-flex-1">Use Scrolls:</span>
        <span class="right">
          <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-use-scrolls-text">
        </span>
      </div>
    </div>

    <div class="cb-section-header">Guild Raid</div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="cb-flex-1">Boss Levels:</span>
        <span class="right">
          Min: <select class="cb-select" id="cb-min-raid-select"></select>
          Max: <select class="cb-select" id="cb-max-raid-select"></select>
        </span>
      </div>
    </div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="cb-flex-1">Reward Item #1:</span>
        <span class="cb-flex-1 right">
          <select class="cb-select" id="cb-raid-item-select"></select>
        </span>
      </div>
      <div class="cb-section-content">
        <span class="cb-flex-1">Reward Item #2:</span>
        <span class="cb-flex-1 right">
          <select class="cb-select" id="cb-raid-item-2-select"></select>
        </span>
      </div>
      <div class="cb-section-content">
        <span class="cb-flex-1">Reward Item #3:</span>
        <span class="cb-flex-1 right">
          <select class="cb-select" id="cb-raid-item-3-select"></select>
        </span>
      </div>
    </div>

  </div>

  <div id="cb-container">
    <div id="cb-container-header" class="cb-header">
      <span id="cb-title" class="text-border-light">IdleLands Scripts</span>
      <button class="cb-accordion cb-active"></button>
    </div>
    <div class="cb-panel">
    <div class="cb-section-header"><span id="cb-player-name"></span> the <span id="cb-player-title"></span> <button id="cb-settings-open" class="cb-settings"></button></div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="cb-flex-1">Auto Free Roll</span>
        <span class="cb-flex-1 right">
          <label class="switch">
            <input id="free-roll-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </span>
      </div>
    </div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="cb-flex-1">Auto Use Scrolls</span>
        <span class="cb-flex-1 right">
          <label class="switch">
            <input id="use-scrolls-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </span>
      </div>
    </div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="cb-flex-1">Auto Donate Gold</span>
        <span class="cb-flex-1 right">
          <label class="switch">
            <input id="donate-gold-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </span>
      </div>
    </div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="cb-flex-1">Optimize Equipment</span>
        <span class="cb-flex-1 right">
          <label class="switch">
            <input id="optimize-equipment-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </span>
      </div>
    </div>
    <div id="cb-optimize-equipment-sub-section" class="cb-sub-section cb-collapsed">
      <div class="cb-section-content">
        <div class="cb-flex-1 small"><span id="optimize-equipment-message">Loading... just a sec.</span></div>
      </div>
    </div>

    <div class="cb-section-header">Pets - Adventures</div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="cb-flex-1">Auto Collect</span>
        <span class="cb-flex-1 right">
          <label class="switch">
            <input id="pet-adventure-collect-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </span>
      </div>
    </div>
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="cb-flex-1">Auto Embark</span>
        <span class="cb-flex-1 right">
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
        <div class="cb-flex-1">Auto Gold Collect</div>
        <div class="cb-flex-1 right">
          <label class="switch">
            <input id="pet-gold-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </div>
      </div>
    </div>
    <div class="cb-section">
      <div class="cb-section-content">
        <div class="cb-flex-1">Auto Ascend</div>
        <div class="cb-flex-1 right">
          <label class="switch">
            <input id="pet-ascend-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </div>
      </div>
    </div>
    <div id="cb-pet-ascend-sub-section" class="cb-sub-section cb-collapsed">
      <div class="cb-section-content">
        <div class="cb-flex-1 small"><span id="pet-ascend-message">Loading... just a sec.</span></div>
      </div>
    </div>
    <div class="cb-section-header">Guild ( <span id="cb-guild-name"></span> )</div>
    ${
    globalData.canGuildRaid
    ? `
    <div class="cb-section">
      <div class="cb-section-content">
        <div class="cb-flex-1">Auto Raid</div>
        <div class="cb-flex-1 right">
          <label class="switch">
            <input id="raids-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </div>
      </div>
    </div>
    <div id="cb-raids-sub-section" class="cb-sub-section cb-collapsed">
      <div class="cb-section-content">
        <div class="cb-flex-1 small">Next Raid @ <span id="guild-next-time">-</span></div>
        <div class="break"></div>
        <div class="cb-flex-1 small">Last Level: <span id="guild-level">-</span></div>
        <div class="break"></div>
        <div class="cb-flex-1 small">Last Reward: <span id="guild-item">-</span></div>
      </div>
    </div>`
    : `
    <div class="cb-sub-section">
      <div class="cb-section-content">
        <div class="cb-flex-1 small">You need to be a guild Leader or Mod to use this feature.</span></div>
      </div>
    </div>`
    }
    <div id="cb-footer" class="text-border-light">by: Torsin - <a href="https://github.com/the-crazyball/idleLands-automation#credits" target="_blank">Credits</a> - <a href="https://github.com/the-crazyball/idleLands-automation" target="_blank">GitHub</a> - <a href="https://discord.gg/vcQrf96n" target="_blank">Discord</a></div>

    </div>
  </div>
  ` );
}

const start = () => {

  const mainLoop = setInterval( () => {
    updateUI();
  }, 500);

  // Event listeners
  document.getElementById("cb-settings-close").addEventListener( 'click', function(e) {
    let el = document.getElementById("cb-settings-container");
    el.classList.toggle("cb-hide");
  });

  document.getElementById("cb-settings-open").addEventListener( 'click', async function(e) {
    let el = document.getElementById("cb-settings-container");
    let style = getComputedStyle(el);
    el.style.left = (e.pageX - parseInt(style.width)) + 'px';
    el.style.top = e.pageY + 'px';

    el.classList.toggle("cb-hide");

    // populate min guild raid level options
    document.getElementById("cb-min-raid-select").innerHTML = await buildMinRaidOptions();
    // populate max guild raid level options
    document.getElementById("cb-max-raid-select").innerHTML = await buildMaxRaidOptions();
    // populate raid items options
    document.getElementById("cb-raid-item-select").innerHTML = buildRaidItemOptions(0);
    document.getElementById("cb-raid-item-2-select").innerHTML = buildRaidItemOptions(1);
    document.getElementById("cb-raid-item-3-select").innerHTML = buildRaidItemOptions(2);

    document.getElementById("cb-pet-adventure-collect-text").value = options.petAdventureCollectInterval;
    document.getElementById("cb-pet-adventure-collect-text").previousSibling.previousSibling.innerHTML = timeConversion(options.petAdventureCollectInterval);

    document.getElementById("cb-pet-adventure-embark-text").value = options.petAdventureEmbarkInterval;
    document.getElementById("cb-pet-adventure-embark-text").previousSibling.previousSibling.innerHTML = timeConversion(options.petAdventureEmbarkInterval);

    document.getElementById("cb-pet-gold-collect-text").value = options.petGoldCollectInterval;
    document.getElementById("cb-pet-gold-collect-text").previousSibling.previousSibling.innerHTML = timeConversion(options.petGoldCollectInterval);

    document.getElementById("cb-pet-auto-ascend-text").value = options.petAutoAscendInterval;
    document.getElementById("cb-pet-auto-ascend-text").previousSibling.previousSibling.innerHTML = timeConversion(options.petAutoAscendInterval);

    document.getElementById("cb-donate-gold-text").value = options.donateGoldInterval;
    document.getElementById("cb-donate-gold-text").previousSibling.previousSibling.innerHTML = timeConversion(options.donateGoldInterval);

    document.getElementById("cb-optimize-equipment-text").value = options.optimizeEquipmentInterval;
    document.getElementById("cb-optimize-equipment-text").previousSibling.previousSibling.innerHTML = timeConversion(options.optimizeEquipmentInterval);

    document.getElementById("cb-guild-raid-text").value = options.guildRaidInterval;
    document.getElementById("cb-guild-raid-text").previousSibling.previousSibling.innerHTML = timeConversion(options.guildRaidInterval);

    document.getElementById("cb-use-scrolls-text").value = options.useScrollsInterval;
    document.getElementById("cb-use-scrolls-text").previousSibling.previousSibling.innerHTML = timeConversion(options.useScrollsInterval);
  });

  let typingTimeout = null;
  document.getElementById("cb-use-scrolls-text").addEventListener( 'keyup', function (e) {
    clearTimeout(typingTimeout);
    e.target.previousSibling.previousSibling.innerHTML = timeConversion(e.target.value);
    typingTimeout = setTimeout(function () {
      saveOptions('useScrollsInterval', e.target.value);
      triggerChange('useScrolls', document.getElementById("use-scrolls-checkbox"), false);
    }, 2000);
  });

  document.getElementById("cb-guild-raid-text").addEventListener( 'keyup', function (e) {
    clearTimeout(typingTimeout);
    e.target.previousSibling.previousSibling.innerHTML = timeConversion(e.target.value);
    typingTimeout = setTimeout(function () {
      saveOptions('guildRaidInterval', e.target.value);
      triggerChange('raids', document.getElementById("raids-checkbox"), false);
    }, 2000);
  });

  document.getElementById("cb-optimize-equipment-text").addEventListener( 'keyup', function (e) {
    clearTimeout(typingTimeout);
    e.target.previousSibling.previousSibling.innerHTML = timeConversion(e.target.value);
    typingTimeout = setTimeout(function () {
      saveOptions('optimizeEquipmentInterval', e.target.value);
      triggerChange('optimizeEquipment', document.getElementById("optimize-equipment-checkbox"), false);
    }, 2000);
  });

  document.getElementById("cb-pet-adventure-collect-text").addEventListener( 'keyup', function (e) {
    clearTimeout(typingTimeout);
    e.target.previousSibling.previousSibling.innerHTML = timeConversion(e.target.value);
    typingTimeout = setTimeout(function () {
      saveOptions('petAdventureCollectInterval', e.target.value);
      triggerChange('petAdventureCollect', document.getElementById("pet-adventure-collect-checkbox"), false);
    }, 2000);
  });

  document.getElementById("cb-pet-adventure-embark-text").addEventListener( 'keyup', function (e) {
    clearTimeout(typingTimeout);
    e.target.previousSibling.previousSibling.innerHTML = timeConversion(e.target.value);
    typingTimeout = setTimeout(function () {
      saveOptions('petAdventureEmbarkInterval', e.target.value);
      triggerChange('petAdventureEmbark', document.getElementById("pet-adventure-embark-checkbox"), false);
    }, 2000);
  });

  document.getElementById("cb-pet-gold-collect-text").addEventListener( 'keyup', function (e) {
    clearTimeout(typingTimeout);
    e.target.previousSibling.previousSibling.innerHTML = timeConversion(e.target.value);
    typingTimeout = setTimeout(function () {
      saveOptions('petGoldCollectInterval', e.target.value);
      triggerChange('petGoldCollect', document.getElementById("pet-gold-checkbox"), false);
    }, 2000);
  });

  document.getElementById("cb-pet-auto-ascend-text").addEventListener( 'keyup', function (e) {
    clearTimeout(typingTimeout);
    e.target.previousSibling.previousSibling.innerHTML = timeConversion(e.target.value);
    typingTimeout = setTimeout(function () {
      saveOptions('petAutoAscendInterval', e.target.value);
      triggerChange('petAutoAscend', document.getElementById("pet-ascend-checkbox"), false);
    }, 2000);
  });

  document.getElementById("cb-donate-gold-text").addEventListener( 'keyup', function (e) {
    clearTimeout(typingTimeout);
    e.target.previousSibling.previousSibling.innerHTML = timeConversion(e.target.value);
    typingTimeout = setTimeout(function () {
      saveOptions('donateGoldInterval', e.target.value);
      triggerChange('donateGold', document.getElementById("donate-gold-checkbox"), false);
    }, 2000);
  });

  var petAdventureCollectLoop;
  document.getElementById("pet-adventure-collect-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          petAdventureCollectLoop = setInterval( claimAdventures, options.petAdventureCollectInterval );
          console.log('pet adventures collect started');
          saveOptions('petAdventureCollect', true);
      } else {
          clearInterval(petAdventureCollectLoop);
          console.log('pet adventures collect stopped');
          saveOptions('petAdventureCollect', false);
      }
  });
  triggerChange('petAdventureCollect', document.getElementById("pet-adventure-collect-checkbox"), true);

  var petAdventureEmbarkLoop;
  document.getElementById("pet-adventure-embark-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          petAdventureEmbarkLoop = setInterval( embarkAdventures, options.petAdventureEmbarkInterval );
          console.log('pet adventures embark started');
          saveOptions('petAdventureEmbark', true);
      } else {
          clearInterval(petAdventureEmbarkLoop);
          console.log('pet adventures embark stopped');
          saveOptions('petAdventureEmbark', false);
      }
  });
  triggerChange('petAdventureEmbark', document.getElementById("pet-adventure-embark-checkbox"), true);

  var petGoldCollectLoop;
  document.getElementById("pet-gold-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          petGoldCollectLoop = setInterval( PetGoldCollect, options.petGoldCollectInterval );
          console.log('pet gold collection started');
          saveOptions('petGoldCollect', true);
      } else {
          clearInterval(petGoldCollectLoop);
          console.log('pet gold collection stopped');
          saveOptions('petGoldCollect', false);
      }
  });
  triggerChange('petGoldCollect', document.getElementById("pet-gold-checkbox"), true);

  var freeRollLoop;
  document.getElementById("free-roll-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          freeRollLoop = setInterval( FreeRoll, 1000*60 );
          console.log('free roll started');
          saveOptions('freeRoll', true);
      } else {
          clearInterval(freeRollLoop);
          console.log('free roll stopped');
          saveOptions('freeRoll', false);
      }
  });
  triggerChange('freeRoll', document.getElementById("free-roll-checkbox"), true);

  var useScrollsLoop;
  document.getElementById("use-scrolls-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          useScrollsLoop = setInterval( UseScrolls, options.useScrollsInterval );
          console.log('use scrolls started');
          saveOptions('useScrolls', true);
      } else {
          clearInterval(useScrollsLoop);
          console.log('use scrolls stopped');
          saveOptions('useScrolls', false);
      }
  });
  triggerChange('useScrolls', document.getElementById("use-scrolls-checkbox"), true);

  var donateGoldLoop;
  document.getElementById("donate-gold-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          donateGoldLoop = setInterval( DonateGold, options.donateGoldInterval );
          console.log('donate gold started');
          saveOptions('donateGold', true);
      } else {
          clearInterval(donateGoldLoop);
          console.log('donate gold stopped');
          saveOptions('donateGold', false);
      }
  });
  triggerChange('donateGold', document.getElementById("donate-gold-checkbox"), true);

  var optimizeEquipmentLoop;
  document.getElementById("optimize-equipment-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          optimizeEquipmentLoop = setInterval( OptimizeEquipment, options.optimizeEquipmentInterval );
          console.log('optimize equipment started');
          saveOptions('optimizeEquipment', true);
          document.getElementById("cb-optimize-equipment-sub-section").classList.toggle("cb-collapsed");
      } else {
          clearInterval(optimizeEquipmentLoop);
          console.log('optimize equipment stopped');
          saveOptions('optimizeEquipment', false);
          document.getElementById("cb-optimize-equipment-sub-section").classList.toggle("cb-collapsed");
      }
  });
  triggerChange('optimizeEquipment', document.getElementById("optimize-equipment-checkbox"), true);

  var petAutoAscendLoop;
  document.getElementById("pet-ascend-checkbox").addEventListener( 'change', function() {
      if(this.checked) {
          petAutoAscendLoop = setInterval( petAscend, options.petAutoAscendInterval );
          console.log('pet auto ascend started');
          saveOptions('petAutoAscend', true);
          document.getElementById("cb-pet-ascend-sub-section").classList.toggle("cb-collapsed");
      } else {
          clearInterval(petAutoAscendLoop);
          console.log('pet auto ascend stopped');
          saveOptions('petAutoAscend', false);
          document.getElementById("cb-pet-ascend-sub-section").classList.toggle("cb-collapsed");
      }
  });
  triggerChange('petAutoAscend', document.getElementById("pet-ascend-checkbox"), true);

  document.getElementById("cb-pets-per-select").addEventListener( 'change', function(e) {
    saveOptions('petAdventurePetNum', e.target.value);
  });
  document.getElementById("cb-optimize-equipment-select").addEventListener( 'change', function(e) {
    saveOptions('optimizeEquipmentStat', e.target.value);
  });
  document.getElementById("cb-min-raid-select").addEventListener( 'change', function(e) {
    saveOptions('guildRaidMinLevel', e.target.value);
  });
  document.getElementById("cb-max-raid-select").addEventListener( 'change', function(e) {
    saveOptions('guildRaidMaxLevel', e.target.value);
  });
  document.getElementById("cb-raid-item-select").addEventListener( 'change', function(e) {
    options.guildRaidItems[0] = e.target.value;
    saveOptions('guildRaidItems', options.guildRaidItems);
  });
  document.getElementById("cb-raid-item-2-select").addEventListener( 'change', function(e) {
    options.guildRaidItems[1] = e.target.value;
    saveOptions('guildRaidItems', options.guildRaidItems);
  });
  document.getElementById("cb-raid-item-3-select").addEventListener( 'change', function(e) {
    options.guildRaidItems[2] = e.target.value;
    saveOptions('guildRaidItems', options.guildRaidItems);
  });

  if(globalData.canGuildRaid) {
    const guildTimeEl = document.getElementById("guild-next-time");
    const guildLevelEl = document.getElementById("guild-level");
    const guildItemEl = document.getElementById("guild-item");

    var raidsLoop;
    document.getElementById("raids-checkbox").addEventListener( 'change', async function() {
          if(this.checked) {
              raidsLoop = setInterval( RunRaids, options.guildRaidInterval );
              console.log('raiding started');

              let guildResponse = await fetch('https://server.idle.land/api/guilds/name?name=' + discordGlobalCharacter.guildName);
              let guildData = await guildResponse.json();

              options.guildRaidNextAvailability = guildData.guild.nextRaidAvailability;
              var date = new Date(options.guildRaidNextAvailability);
              guildTimeEl.innerHTML = date.toLocaleTimeString();
              document.getElementById("cb-raids-sub-section").classList.toggle("cb-collapsed");
              saveOptions('raids', true);
          } else {
              clearInterval(raidsLoop);
              console.log('raiding stopped');
              guildTimeEl.innerHTML = '-';
              guildLevelEl.innerHTML = '-';
              guildItemEl.innerHTML = '-';
              document.getElementById("cb-raids-sub-section").classList.toggle("cb-collapsed");
              saveOptions('raids', false);
          }
    });
    triggerChange('raids', document.getElementById("raids-checkbox"), true);
  }

  // Make the whole container draggable
  dragElement(document.getElementById("cb-settings-container"));
  dragElement(document.getElementById("cb-container"));
  accordionElement(document.getElementById("cb-container"));

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
    let someMaterialsMissing = Object.keys(pet.$ascMaterials).some((mat) => pet.$ascMaterials[mat] > (discordGlobalCharacter.$petsData.ascensionMaterials[mat] || 0))
    if(someMaterialsMissing) {
        document.getElementById("pet-ascend-message").innerHTML = 'Oops, you are missing materials';
        return false;
    }

    // get gold before ascend
    setTimeout( () => { unsafeWindow.__emitSocket('pet:takegold') }, 200)
    // then ascend
    setTimeout( () => { unsafeWindow.__emitSocket("pet:ascend") }, 500);
  }

  // Pet adventures
  const claimAdventures = () => {

      // get expired adventures and claim
      let adventuresFinished = Object.values(discordGlobalCharacter.$petsData.adventures).filter(x => (x.finishAt <= Date.now()) && x.finishAt != 0);

      if (adventuresFinished.length) {
        for (let i = 0; i < adventuresFinished.length; i++) {
          let currentAdventure = adventuresFinished[i];

          setTimeout( () => {
            unsafeWindow.__emitSocket("pet:adventure:finish", { adventureId: currentAdventure.id }); // Collect
          }, 1000 * i);
        }
      }
  }
  const embarkAdventures = () => {

      // assign pets to adventures
      let adventuresNotStarted = Object.values(discordGlobalCharacter.$petsData.adventures).filter(x => !x.finishAt);

      if (adventuresNotStarted.length) {
        for (let i = 0; i < adventuresNotStarted.length; i++) {
          let currentAdventure = adventuresNotStarted[i];

          setTimeout( () => {
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
          }, 1000 * i);
        }
      }
  }

  // Raids
  // keep trying until reaching level 100 then turn off? Check for guild gold?
  const RunRaids = async () => {

    if(options.guildRaidNextAvailability <= Date.now()) {

        let level = 0;
        let reward = '';

        let response = await fetch('https://server.idle.land/api/guilds/raids?maxLevel=' + options.guildRaidMaxLevel);
        let data = await response.json();

        let results = data.raids.filter(element => {
            return element.rewards.some(r => options.guildRaidItems.includes(r)) && (element.level >= options.guildRaidMinLevel && element.level <= options.guildRaidMaxLevel);
        });

        if (results.length > 0) {
            level = results[results.length-1].level;
            reward = raidRewards[results[results.length-1].rewards[0]];
        } else {
            level = options.guildRaidMaxLevel;
            reward = raidRewards[data.raids[data.raids.length-1].rewards[0]];
        }

        level = globalData.raidFail ? globalData.lastRaidBossLevel : level;
        setTimeout( () => {unsafeWindow.__emitSocket("guild:raidboss", { bossLevel: level})}, 500);

        setTimeout(async () => {
            let guild = await getGuildData();
            let date = new Date(guild.nextRaidAvailability);

            // if raid fails, try lower level
            if(guild.nextRaidAvailability == options.guildRaidNextAvailability) {
              // if this is true then something went wrong with the raid, either failed or lost.
              globalData.raidFail = true;
              globalData.lastRaidBossLevel = globalData.lastRaidBossLevel == 0 ? level : globalData.lastRaidBossLevel;
              globalData.lastRaidBossLevel -= 50;
              console.log('raid failed or lost', level, globalData.lastRaidBossLevel);
            } else {
              globalData.raidFail = false;
              globalData.lastRaidBossLevel = level;
            }
            options.guildRaidNextAvailability = guild.nextRaidAvailability;

            document.getElementById("guild-next-time").innerHTML = date.toLocaleTimeString();
            document.getElementById("guild-level").innerHTML = level;
            document.getElementById("guild-item").innerHTML = reward;
        }, 7000); // added 5 seconds extra
    }
  }

  const UseScrolls = () => {
    let delay = 200;
    let scrolls = discordGlobalCharacter.$inventoryData.buffScrolls;
    scrolls.forEach(element => {
      setTimeout( () => {
        unsafeWindow.__emitSocket('item:buffscroll', { scrollId: element.id });
      }, delay);
      delay += 1000;
    })
  }

  const OptimizeEquipment = () => {

    let delay = 200;
    let currentEquipment = discordGlobalCharacter.$inventoryData.equipment;
    let currentInventory = discordGlobalCharacter.$inventoryData.items;

    currentInventory.forEach(element => {
      let slot = element.type;
      let newItemStat = element.stats[options.optimizeEquipmentStat] || 0;
      let oldItemStat = currentEquipment[slot].stats[options.optimizeEquipmentStat] || 0;
      if(newItemStat > oldItemStat) {
        setTimeout( () => {
          unsafeWindow.__emitSocket('item:equip', { itemId: element.id });
        }, delay);
        delay += 1000;
      }
    })
  }

  const FreeRoll = () => {
    if(discordGlobalCharacter.$premiumData.gachaFreeRolls["Astral Gate"] <= Date.now()) {
      let gachaName = 'AstralGate';
      let numRolls = 10;
      setTimeout( () => {unsafeWindow.__emitSocket('astralgate:roll', { astralGateName: gachaName, numRolls }) }, 500);
    }
  }
  const PetGoldCollect = () => {
    setTimeout( () => {unsafeWindow.__emitSocket("pet:takegold")}, 500);
  }
  const DonateGold = () => {
    setTimeout( () => {unsafeWindow.__emitSocket("guild:donateresource", { resource: 'gold', amount: discordGlobalCharacter.gold })}, 500);
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

const getGuildData = async () => {
  let response = await fetch('https://server.idle.land/api/guilds/name?name=' + discordGlobalCharacter.guildName);
  let data = await response.json();
  return data.guild;
}
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

const updateUI = () => {
    document.getElementById("optimize-equipment-message").innerHTML = 'Optimized for ' + options.optimizeEquipmentStat + ' - Boost: ' + formatNumber(discordGlobalCharacter.stats[options.optimizeEquipmentStat]);
    document.getElementById("cb-player-name").innerHTML = discordGlobalCharacter.name;
    document.getElementById("cb-player-title").innerHTML = discordGlobalCharacter.title;
    document.getElementById("cb-guild-name").innerHTML = discordGlobalCharacter.guildName ? discordGlobalCharacter.guildName : 'Not part of a guild';
    document.getElementById("cb-pet-type").innerHTML = discordGlobalCharacter.$petsData.currentPet;
    document.getElementById("cb-pet-levels").innerHTML = discordGlobalCharacter.$petsData.allPets[discordGlobalCharacter.$petsData.currentPet].level.__current + '/' + discordGlobalCharacter.$petsData.allPets[discordGlobalCharacter.$petsData.currentPet].level.maximum;
}
