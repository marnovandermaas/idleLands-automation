export const settingsWindow = `
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
    <div class="cb-section">
      <div class="cb-section-content">
        <span class="cb-flex-1">Pet Optimize Equipment:</span>
        <span class="cb-flex-1 right">
          <select class="cb-select" id="cb-pet-optimize-equipment-select">
            <option value="gold" ${options.petOptimizeEquipmentStat == 'gold' ? `selected` : ``}>gold</option>
            <option value="xp" ${options.petOptimizeEquipmentStat == 'xp' ? `selected` : ``}>xp</option>
            <option value="score" ${options.petOptimizeEquipmentStat == 'score' ? `selected` : ``}>score</option>
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
        <span class="cb-flex-1">Pet Optimize Equipment:</span>
        <span class="right">
          <span class="cb-extra-small"></span> <input type="text" class="cb-input-small" id="cb-pet-optimize-equipment-text">
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

  </div>`;

export const mainWindow = `
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

    <div class="cb-section">
      <div class="cb-section-content">
        <div class="cb-flex-1">Optimize Equipment</div>
        <div class="cb-flex-1 right">
          <label class="switch">
            <input id="pet-optimize-equipment-checkbox" type="checkbox">
            <span class="slider round"></span>
          </label>
        </div>
      </div>
    </div>
    <div id="cb-pet-optimize-equipment-sub-section" class="cb-sub-section cb-collapsed">
      <div class="cb-section-content">
        <div class="cb-flex-1 small"><span id="pet-optimize-equipment-message">Loading... just a sec.</span></div>
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
    <div id="cb-footer" class="text-border-light">by: Torsin - <a href="https://github.com/the-crazyball/idleLands-automation#credits" target="_blank">Credits</a> - <a href="https://github.com/the-crazyball/idleLands-automation" target="_blank">GitHub</a> - <a href="https://discord.gg/HB8QUxh2Qs" target="_blank">Discord</a></div>

    </div>
  </div>
  `;
