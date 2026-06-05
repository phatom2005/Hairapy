package com.example.demo.services;

import com.example.demo.exceptions.ResourceNotFoundException;
import com.example.demo.models.Item;
import com.example.demo.repositories.ItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ItemService {

    private final ItemRepository itemRepository;

    public List<Item> getAllItems() {
        return itemRepository.findAll();
    }

    public @NonNull Item getItemById(@NonNull Long id) {
        return itemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found with id: " + id));
    }

    public Item createItem(@NonNull Item item) {
        return itemRepository.save(item);
    }

    public Item updateItem(@NonNull Long id, @NonNull Item itemDetails) {
        Item item = getItemById(id);
        item.setName(itemDetails.getName());
        item.setDescription(itemDetails.getDescription());
        return itemRepository.save(item);
    }

    public void deleteItem(@NonNull Long id) {
        Item item = getItemById(id);
        itemRepository.delete(item);
    }
}
