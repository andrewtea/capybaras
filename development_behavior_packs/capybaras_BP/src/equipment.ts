import {
    system,
    Entity,
    Player,
    EntityInventoryComponent,
} from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { itemIcons, allowedHeadItems, allowedBodyItems } from "constants";
import { playerCooldowns } from "constants";

export function showCapybaraEquipmentUI(player: Player, capybara: Entity) {
    const inv = capybara.getComponent(
        "minecraft:inventory"
    ) as EntityInventoryComponent;
    const container = inv?.container;
    if (!container) return;

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

        if (res.selection === 0) showEquipMenu(player, capybara, "Armor");
        else if (res.selection === 1)
            showEquipMenu(player, capybara, "Cosmetics");
        else playerCooldowns.set(player.id, system.currentTick);
    });
}

/* =========================
   EQUIP MENU
========================= */

function showEquipMenu(
    player: Player,
    capybara: Entity,
    slot: "Armor" | "Cosmetics"
) {
    const inv = capybara.getComponent(
        "minecraft:inventory"
    ) as EntityInventoryComponent;
    const container = inv?.container;
    if (!container) return;

    const headSlot = slot === "Armor" ? 0 : 2;
    const bodySlot = slot === "Armor" ? 1 : 3;
    const head = container.getItem(headSlot);
    const body = container.getItem(bodySlot);

    const equipForm = new ActionFormData()
        .title(`Equip ${slot}`)
        .button(
            "Equip Head",
            head ? itemIcons[head.typeId] : "textures/blocks/barrier"
        )
        .button("Unequip Head", "textures/ui/cancel")
        .divider()
        .button(
            "Equip Body",
            body ? itemIcons[body.typeId] : "textures/blocks/barrier"
        )
        .button("Unequip Body", "textures/ui/cancel")
        .divider()
        .button("Close");

    equipForm.show(player).then((res) => {
        if (res.canceled || res.selection === undefined) {
            playerCooldowns.set(player.id, system.currentTick);
            return;
        }
        const inventory = player.getComponent(
            "minecraft:inventory"
        ) as EntityInventoryComponent;
        const handItem = inventory.container?.getItem(player.selectedSlotIndex);

        switch (res.selection) {
            case 0:
                if (!handItem) {
                    player.sendMessage(
                        "§cYou must hold something in your hand to equip!§c"
                    );
                    return;
                }
                if (!allowedHeadItems.has(handItem.typeId)) {
                    player.sendMessage("§cYour capybara cannot equip that item!§r");
                    return;
                }
                container.swapItems(
                    headSlot,
                    player.selectedSlotIndex,
                    inventory.container
                );
                break;
            case 1:
                if (inventory.container.emptySlotsCount == 0) {
                    player.sendMessage("§cYour inventory is full!§r");
                    return;
                }
                container.moveItem(
                    headSlot,
                    inventory.container.firstEmptySlot(),
                    inventory.container
                );
                break;
            case 2:
                if (!handItem) {
                    player.sendMessage(
                        "§cYou must hold something in your hand to equip!§r"
                    );
                    return;
                }
                if (!allowedBodyItems.has(handItem.typeId)) {
                    player.sendMessage("§cYour capybara cannot equip that item!§r");
                    return;
                }
                container.swapItems(
                    bodySlot,
                    player.selectedSlotIndex,
                    inventory.container
                );
                break;
            case 3:
                if (inventory.container.emptySlotsCount == 0) {
                    player.sendMessage("§cYour inventory is full!§r");
                    return;
                }
                container.moveItem(
                    bodySlot,
                    inventory.container.firstEmptySlot(),
                    inventory.container
                );
                break;
            default:
                break;
        }
    });
}
