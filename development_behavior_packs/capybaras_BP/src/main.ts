import {
    world,
    system,
    Entity,
    Player,
    EntityInventoryComponent,
    ItemStack
} from "@minecraft/server";
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

const ITEM_NAMES: Record<string, string> = {
    "asb_cb:top_hat": "Top Hat",
    "asb_cb:turtle_hat": "Turtle Hat",
    "minecraft:turtle_helmet": "Turtle Element",
    "minecraft:diamond_helmet": "Diamond Helmet",
    "minecraft:diamond_chestplate": "Diamond Chestplate",
    "minecraft:leather_chestplate": "Leather Tunic",
    "capybara:melon_on_a_stick": "Melon on a Stick"
};

function prettifyIdentifier(id: string): string {
    return id
        .replace(/_/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
}

function getItemDisplayName(typeId: string): string {
    const short = typeId.includes(":") ? typeId.split(":")[1] : typeId;
    return ITEM_NAMES[typeId] ?? prettifyIdentifier(short);
}

/* =========================
   COOLDOWN
========================= */

const playerCooldowns = new Map<string, number>();
const COOLDOWN_TICKS = 10;

/* =========================
   AUTO-EQUIP ON SPAWN
========================= */

world.afterEvents.entitySpawn.subscribe(event => {
    const entity = event.entity;
    if (entity.typeId !== CAPYBARA_ID) return;

    const inv = entity.getComponent("minecraft:inventory") as EntityInventoryComponent;
    inv?.container?.setItem(0, new ItemStack("asb_cb:top_hat"));
});

/* =========================
   INTERACTION HANDLER
========================= */

world.beforeEvents.playerInteractWithEntity.subscribe(event => {
    const { player, target } = event;
    if (target.typeId !== CAPYBARA_ID) return;
    if (!player.isSneaking) return;

    const now = system.currentTick;
    const last = playerCooldowns.get(player.id);
    if (last && now - last < COOLDOWN_TICKS) return;

    event.cancel = true;
    system.run(() => showCapybaraEquipmentUI(player, target));
});

/* =========================
   MAIN UI
========================= */

function showCapybaraEquipmentUI(player: Player, capybara: Entity) {
    const inv = capybara.getComponent("minecraft:inventory") as EntityInventoryComponent;
    const container = inv?.container;
    if (!container) return;

    const head = container.getItem(0);
    const body = container.getItem(1);

    const form = new ActionFormData()
        .title("Capybara Equipment")
        .body(
            `Head: ${head ? getItemDisplayName(head.typeId) : "None"}\n` +
            `Body: ${body ? getItemDisplayName(body.typeId) : "None"}`
        )
        .button("Equip / Unequip Head")
        .button("Equip / Unequip Body")
        .button("Close");

    form.show(player).then(res => {
        if (res.canceled || res.selection === undefined) {
            playerCooldowns.set(player.id, system.currentTick);
            return;
        }

        if (res.selection === 0) showEquipMenu(player, capybara, "head");
        else if (res.selection === 1) showEquipMenu(player, capybara, "body");
        else playerCooldowns.set(player.id, system.currentTick);
    });
}

/* =========================
   EQUIP MENU
========================= */

function showEquipMenu(player: Player, capybara: Entity, slot: "head" | "body") {
    const inv = capybara.getComponent("minecraft:inventory") as EntityInventoryComponent;
    const container = inv?.container;
    if (!container) return;

    const valid = slot === "head" ? HEAD_ITEMS : BODY_ITEMS;
    const index = slot === "head" ? 0 : 1;
    const equipped = container.getItem(index);

    const form = new ActionFormData()
        .title(`Equip ${slot === "head" ? "Head" : "Body"}`)
        .body(`Currently Equipped: ${equipped ? getItemDisplayName(equipped.typeId) : "None"}`)
        .button(equipped ? "Unequip" : "Nothing Equipped");

    for (const id of valid) {
        form.button(getItemDisplayName(id));
    }

    form.button("Back");

    form.show(player).then(res => {
        if (res.canceled || res.selection === undefined) {
            playerCooldowns.set(player.id, system.currentTick);
            return;
        }

        if (res.selection === 0 && equipped) {
            giveBack(player, equipped);
            container.setItem(index, undefined);
            showCapybaraEquipmentUI(player, capybara);
            return;
        }

        const backIndex = valid.length + 1;
        if (res.selection === backIndex) {
            showCapybaraEquipmentUI(player, capybara);
            return;
        }

        const selected = valid[res.selection - 1];
        if (!selected) return showCapybaraEquipmentUI(player, capybara);

        if (!takeFromPlayer(player, selected)) {
            player.sendMessage(`You don't have ${getItemDisplayName(selected)}.`);
            return showCapybaraEquipmentUI(player, capybara);
        }

        if (equipped) giveBack(player, equipped);
        container.setItem(index, new ItemStack(selected));
        showCapybaraEquipmentUI(player, capybara);
    });
}

/* =========================
   INVENTORY HELPERS
========================= */

function takeFromPlayer(player: Player, typeId: string): boolean {
    const inv = player.getComponent("minecraft:inventory") as any;
    const c = inv?.container;
    if (!c) return false;

    for (let i = 0; i < c.size; i++) {
        const item = c.getItem(i);
        if (item?.typeId === typeId) {
            c.setItem(i, undefined);
            return true;
        }
    }
    return false;
}

function giveBack(player: Player, item: ItemStack) {
    const inv = player.getComponent("minecraft:inventory") as any;
    const c = inv?.container;
    if (!c) return;

    for (let i = 0; i < c.size; i++) {
        if (!c.getItem(i)) {
            c.setItem(i, item);
            return;
        }
    }
}
