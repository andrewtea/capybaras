import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
const CAPYBARA_ID = "capybara:capybara";
/* =========================
   DISPLAY NAME MAP
========================= */
const ITEM_ICONS = {
    "asb_cb:top_hat": "textures/items/top_hat_icon",
    "asb_cb:turtle_hat": "textures/items/turtle_hat_icon",
    "minecraft:turtle_helmet": "textures/items/turtle_helmet",
    "minecraft:leather_helmet": "textures/items/leather_helmet",
    "minecraft:copper_helmet": "textures/items/copper_helmet",
    "minecraft:golden_helmet": "textures/items/gold_helmet",
    "minecraft:chainmail_helmet": "textures/items/chainmail_helmet",
    "minecraft:iron_helmet": "textures/items/iron_helmet",
    "minecraft:diamond_helmet": "textures/items/diamond_helmet",
    "minecraft:netherite_helmet": "textures/items/netherite_helmet",
    "minecraft:leather_chestplate": "textures/items/leather_chestplate",
    "minecraft:copper_chestplate": "textures/items/copper_chestplate",
    "minecraft:golden_chestplate": "textures/items/gold_chestplate",
    "minecraft:chainmail_chestplate": "textures/items/chainmail_chestplate",
    "minecraft:iron_chestplate": "textures/items/iron_chestplate",
    "minecraft:diamond_chestplate": "textures/items/diamond_chestplate",
    "minecraft:netherite_chestplate": "textures/items/netherite_chestplate"
};
const ALLOWED_HEAD_ITEMS = new Set([
    "asb_cb:top_hat",
    "asb_cb:turtle_hat",
    "minecraft:turtle_helmet",
    "minecraft:leather_helmet",
    "minecraft:copper_helmet",
    "minecraft:golden_helmet",
    "minecraft:chainmail_helmet",
    "minecraft:iron_helmet",
    "minecraft:diamond_helmet",
    "minecraft:netherite_helmet",
]);
const ALLOWED_BODY_ITEMS = new Set([
    "minecraft:leather_chestplate",
    "minecraft:copper_chestplate",
    "minecraft:golden_chestplate",
    "minecraft:chainmail_chestplate",
    "minecraft:iron_chestplate",
    "minecraft:diamond_chestplate",
    "minecraft:netherite_chestplate",
]);
function prettifyIdentifier(id) {
    return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
/* =========================
   COOLDOWN
========================= */
const playerCooldowns = new Map();
const COOLDOWN_TICKS = 10;
/* =========================
   INTERACTION HANDLER
========================= */
world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
    const { player, target } = event;
    if (target.typeId !== CAPYBARA_ID)
        return;
    if (target.hasComponent("is_baby"))
        return;
    if (!player.isSneaking)
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
    armorCosForm.show(player).then((res) => {
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
    equipForm.show(player).then((res) => {
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
                if (!ALLOWED_HEAD_ITEMS.has(handItem.typeId)) {
                    player.sendMessage("Your capybara cannot equip that item!");
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
                if (!ALLOWED_BODY_ITEMS.has(handItem.typeId)) {
                    player.sendMessage("Your capybara cannot equip that item!");
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
