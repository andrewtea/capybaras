import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
const CAPYBARA_ID = "capybara:capybara";
// Valid items for each slot
const HEAD_ITEMS = ["asb_cb:top_hat", "asb_cb:turtle_hat", "minecraft:diamond_helmet"];
const BODY_ITEMS = ["minecraft:diamond_chestplate", "minecraft:leather_chestplate"];
// Auto-equip top hat on spawn
world.afterEvents.entitySpawn.subscribe((event) => {
    const entity = event.entity;
    if (entity.typeId !== CAPYBARA_ID)
        return;
    const inventory = entity.getComponent("minecraft:inventory");
    if (inventory?.container) {
        inventory.container.setItem(0, new ItemStack("asb_cb:top_hat"));
    }
});
// Open custom UI when interacting with capybara while sneaking
world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
    const target = event.target;
    const player = event.player;
    if (target.typeId !== CAPYBARA_ID)
        return;
    if (!player.isSneaking)
        return; // Only open UI when sneaking, normal interact = mount
    event.cancel = true;
    // Must run UI in next tick
    system.run(() => {
        showCapybaraEquipmentUI(player, target);
    });
});
function showCapybaraEquipmentUI(player, capybara) {
    const capyInv = capybara.getComponent("minecraft:inventory");
    if (!capyInv?.container)
        return;
    const headItem = capyInv.container.getItem(0);
    const bodyItem = capyInv.container.getItem(1);
    const headStatus = headItem ? headItem.typeId.split(":")[1] : "Empty";
    const bodyStatus = bodyItem ? bodyItem.typeId.split(":")[1] : "Empty";
    const form = new ActionFormData()
        .title("Capybara Equipment")
        .body(`Manage your capybara's equipment.\n\nHead: ${headStatus}\nBody: ${bodyStatus}`)
        .button(`Head Slot: ${headStatus}`, "textures/ui/book_ui")
        .button(`Body Slot: ${bodyStatus}`, "textures/ui/book_ui")
        .button("Close");
    form.show(player).then((response) => {
        if (response.canceled || response.selection === 2)
            return;
        system.run(() => {
            if (response.selection === 0) {
                handleSlotInteraction(player, capybara, 0, HEAD_ITEMS, "Head");
            }
            else if (response.selection === 1) {
                handleSlotInteraction(player, capybara, 1, BODY_ITEMS, "Body");
            }
        });
    });
}
function handleSlotInteraction(player, capybara, slotIndex, validItems, slotName) {
    const capyInv = capybara.getComponent("minecraft:inventory");
    const playerInv = player.getComponent("minecraft:inventory");
    if (!capyInv?.container || !playerInv?.container)
        return;
    const currentItem = capyInv.container.getItem(slotIndex);
    const form = new ActionFormData()
        .title(`${slotName} Slot`);
    if (currentItem) {
        const itemName = currentItem.typeId.split(":")[1];
        form.body(`Currently equipped: ${itemName}\n\nUnequip to retrieve the item.`)
            .button("Unequip")
            .button("Back");
    }
    else {
        form.body(`Slot is empty.\n\nHold a valid item and select "Equip from Hand" to equip it.\n\nValid items: ${validItems.map(i => i.split(":")[1]).join(", ")}`)
            .button("Equip from Hand")
            .button("Back");
    }
    form.show(player).then((response) => {
        if (response.canceled || response.selection === 1) {
            // Go back to main UI
            system.run(() => showCapybaraEquipmentUI(player, capybara));
            return;
        }
        system.run(() => {
            if (currentItem) {
                // Unequip - give item to player
                const emptySlot = findEmptySlot(playerInv.container);
                if (emptySlot !== -1) {
                    playerInv.container.setItem(emptySlot, currentItem);
                    capyInv.container.setItem(slotIndex, undefined);
                    player.sendMessage(`§aUnequipped ${currentItem.typeId.split(":")[1]} from ${slotName} slot.`);
                }
                else {
                    player.sendMessage("§cYour inventory is full!");
                }
            }
            else {
                // Equip from hand
                const heldItem = playerInv.container.getItem(player.selectedSlotIndex);
                if (heldItem && validItems.includes(heldItem.typeId)) {
                    capyInv.container.setItem(slotIndex, heldItem);
                    playerInv.container.setItem(player.selectedSlotIndex, undefined);
                    player.sendMessage(`§aEquipped ${heldItem.typeId.split(":")[1]} to ${slotName} slot.`);
                }
                else if (heldItem) {
                    player.sendMessage(`§c${heldItem.typeId.split(":")[1]} cannot be equipped in the ${slotName} slot.`);
                }
                else {
                    player.sendMessage("§cYou're not holding anything!");
                }
            }
            // Return to main UI
            showCapybaraEquipmentUI(player, capybara);
        });
    });
}
function findEmptySlot(container) {
    for (let i = 0; i < container.size; i++) {
        if (!container.getItem(i))
            return i;
    }
    return -1;
}
