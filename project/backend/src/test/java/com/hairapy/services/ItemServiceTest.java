package com.hairapy.services;

import com.hairapy.dto.ItemDTO;
import com.hairapy.dto.ItemRequest;
import com.hairapy.exceptions.ResourceNotFoundException;
import com.hairapy.models.Item;
import com.hairapy.repositories.ItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ItemServiceTest {

    @Mock
    private ItemRepository itemRepository;

    @InjectMocks
    private ItemService itemService;

    private Item sampleItem;

    @BeforeEach
    void setUp() {
        sampleItem = Item.builder()
                .id(1L)
                .name("Test Item")
                .description("Test description")
                .build();
    }

    @Test
    void getAllItems_returnsListOfDTOs() {
        when(itemRepository.findAll()).thenReturn(List.of(sampleItem));

        List<ItemDTO> result = itemService.getAllItems();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("Test Item");
    }

    @Test
    void getItemById_existingId_returnsDTO() {
        when(itemRepository.findById(1L)).thenReturn(Optional.of(sampleItem));

        ItemDTO result = itemService.getItemById(1L);

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.name()).isEqualTo("Test Item");
    }

    @Test
    void getItemById_nonExistingId_throwsResourceNotFoundException() {
        when(itemRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> itemService.getItemById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void createItem_savesAndReturnsDTO() {
        ItemRequest request = new ItemRequest("New Item", "New description");
        when(itemRepository.save(any(Item.class))).thenReturn(sampleItem);

        ItemDTO result = itemService.createItem(request);

        assertThat(result.name()).isEqualTo("Test Item");
        verify(itemRepository, times(1)).save(any(Item.class));
    }

    @Test
    void updateItem_existingId_updatesAndReturnsDTO() {
        ItemRequest request = new ItemRequest("Updated", "Updated desc");
        Item updated = Item.builder().id(1L).name("Updated").description("Updated desc").build();
        when(itemRepository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(itemRepository.save(any(Item.class))).thenReturn(updated);

        ItemDTO result = itemService.updateItem(1L, request);

        assertThat(result.name()).isEqualTo("Updated");
    }

    @Test
    void deleteItem_existingId_deletesItem() {
        when(itemRepository.findById(1L)).thenReturn(Optional.of(sampleItem));

        itemService.deleteItem(1L);

        verify(itemRepository, times(1)).delete(sampleItem);
    }

    @Test
    void deleteItem_nonExistingId_throwsResourceNotFoundException() {
        when(itemRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> itemService.deleteItem(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
