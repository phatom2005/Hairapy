package com.hairapy.services;

import com.hairapy.dto.ItemDTO;
import com.hairapy.dto.ItemRequest;
import com.hairapy.exceptions.ResourceNotFoundException;
import com.hairapy.models.Item;
import com.hairapy.repositories.ItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ItemService {

    private final ItemRepository itemRepository;

    public List<ItemDTO> getAllItems() {
        return itemRepository.findAll().stream()
                .map(ItemDTO::from)
                .toList();
    }

    public ItemDTO getItemById(Long id) {
        return ItemDTO.from(findById(id));
    }

    @Transactional
    public ItemDTO createItem(ItemRequest request) {
        Item item = Item.builder()
                .name(request.name())
                .description(request.description())
                .build();
        return ItemDTO.from(itemRepository.save(item));
    }

    @Transactional
    public ItemDTO updateItem(Long id, ItemRequest request) {
        Item item = findById(id);
        item.setName(request.name());
        item.setDescription(request.description());
        return ItemDTO.from(itemRepository.save(item));
    }

    @Transactional
    public void deleteItem(Long id) {
        itemRepository.delete(findById(id));
    }

    private Item findById(Long id) {
        return itemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found with id: " + id));
    }
}
