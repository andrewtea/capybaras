import { world, ItemStack } from "@minecraft/server";
const capybaraID = "capybara:capybara";
world.afterEvents.entitySpawn.subscribe((event) => {
    var entity = event.entity;
    if (entity.typeId != capybaraID) {
        return;
    }
    //entity.nameTag = "Capybara";
    var inventory = entity.getComponent("minecraft:inventory");
    inventory.container.setItem(0, new ItemStack("asb_cb:top_hat"));
});
