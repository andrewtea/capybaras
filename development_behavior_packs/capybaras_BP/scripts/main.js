import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
const CAPYBARA_ID = "capybara:capybara";
/* =========================
   VALID EQUIPMENT
========================= */
const HEAD_ITEMS = [
    "asb_cb:top_hat",
    "asb_cb:turtle_hat",
    "minecraft:turtle_helmet",
    "minecraft:diamond_helmet"
];
const BODY_ITEMS = [
    "minecraft:diamond_chestplate",
    "minecraft:leather_chestplate"
];
/* =========================
   DISPLAY NAME MAP
========================= */
const ITEM_NAMES = {
    "asb_cb:top_hat": "Top Hat",
    "asb_cb:turtle_hat": "Turtle Hat",
    "minecraft:turtle_helmet": "Turtle Helmet",
    "minecraft:diamond_helmet": "Diamond Helmet",
    "minecraft:diamond_chestplate": "Diamond Chestplate",
    "minecraft:leather_chestplate": "Leather Tunic",
    "capybara:melon_on_a_stick": "Melon on a Stick"
};
const ITEM_ICONS = {
    "asb_cb:top_hat": "textures/items/top_hat_icon",
    "asb_cb:turtle_hat": "textures/items/turtle_hat_icon",
    "minecraft:turtle_helmet": "textures/items/turtle_helmet",
    "minecraft:diamond_helmet": "textures/items/diamond_helmet",
    "minecraft:diamond_chestplate": "textures/items/diamond_chestplate",
    "minecraft:leather_chestplate": "textures/items/leather_chestplate",
    "capybara:melon_on_a_stick": "textures/items/melon_on_a_stick"
};
function prettifyIdentifier(id) {
    return id
        .replace(/_/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
}
function getItemDisplayName(typeId) {
    const short = typeId.includes(":") ? typeId.split(":")[1] : typeId;
    return ITEM_NAMES[typeId] ?? prettifyIdentifier(short);
}
/* =========================
   COOLDOWN
========================= */
const playerCooldowns = new Map();
const COOLDOWN_TICKS = 10;
/* =========================
   INTERACTION HANDLER
========================= */
world.beforeEvents.playerInteractWithEntity.subscribe(event => {
    const { player, target } = event;
    if (target.typeId !== CAPYBARA_ID)
        return;
    const now = system.currentTick;
    const last = playerCooldowns.get(player.id);
    if (last && now - last < COOLDOWN_TICKS)
        return;
    event.cancel = true;
    system.run(() => showCapybaraEquipmentUI(player, target));
});
/* =========================
   MAIN UI
========================= */
function showCapybaraEquipmentUI(player, capybara) {
    const inv = capybara.getComponent("minecraft:inventory");
    const container = inv?.container;
    if (!container)
        return;
    const headArmor = container.getItem(0);
    const bodyArmor = container.getItem(1);
    const headCos = container.getItem(2);
    const bodyCos = container.getItem(3);
    const armorCosForm = new ActionFormData()
        .title("Capybara Equipment")
        .body("Hold an item to equip")
        .button("Equip / Unequip Armor")
        .button("Equip / Unequip Cosmetics");
    armorCosForm.show(player).then(res => {
        if (res.canceled || res.selection === undefined) {
            playerCooldowns.set(player.id, system.currentTick);
            return;
        }
        if (res.selection === 0)
            showEquipMenu(player, capybara, "Armor");
        else if (res.selection === 1)
            showEquipMenu(player, capybara, "Cosmetics");
        else
            playerCooldowns.set(player.id, system.currentTick);
    });
}
/* =========================
   EQUIP MENU
========================= */
function showEquipMenu(player, capybara, slot) {
    const inv = capybara.getComponent("minecraft:inventory");
    const container = inv?.container;
    if (!container)
        return;
    const headSlot = slot === "Armor" ? 0 : 2;
    const bodySlot = slot === "Armor" ? 1 : 3;
    const head = container.getItem(headSlot);
    const body = container.getItem(bodySlot);
    const equipForm = new ActionFormData()
        .title(`Equip ${slot}`)
        .button("Equip Head", head ? ITEM_ICONS[head.typeId] : "textures/blocks/barrier")
        .button("Unequip Head", "textures/ui/cancel")
        .divider()
        .button("Equip Body", body ? ITEM_ICONS[body.typeId] : "textures/blocks/barrier")
        .button("Unequip Body", "textures/ui/cancel")
        .divider()
        .button("Close");
    equipForm.show(player).then(res => {
        if (res.canceled || res.selection === undefined) {
            playerCooldowns.set(player.id, system.currentTick);
            return;
        }
        const inventory = player.getComponent("minecraft:inventory");
        const handItem = inventory.container?.getItem(player.selectedSlotIndex);
        switch (res.selection) {
            case 0:
                if (!handItem) {
                    player.sendMessage("You must hold something in your hand to equip!");
                    return;
                }
                container.swapItems(headSlot, player.selectedSlotIndex, inventory.container);
                break;
            case 1:
                if (inventory.container.emptySlotsCount == 0) {
                    player.sendMessage("Your inventory is full!");
                    return;
                }
                container.moveItem(headSlot, inventory.container.firstEmptySlot(), inventory.container);
                break;
            case 2:
                if (!handItem) {
                    player.sendMessage("You must hold something in your hand to equip!");
                    return;
                }
                container.swapItems(bodySlot, player.selectedSlotIndex, inventory.container);
                break;
            case 3:
                if (inventory.container.emptySlotsCount == 0) {
                    player.sendMessage("Your inventory is full!");
                    return;
                }
                container.moveItem(bodySlot, inventory.container.firstEmptySlot(), inventory.container);
                break;
            default:
                break;
        }
    });
}
