import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Search } from 'lucide-react';
import { api } from '../../../shared/lib/api';
import type { Tag, ApiError } from '../../../shared/lib/api';
import { Badge } from '../../../shared/ui/badge/Badge';
import { useToast } from '../../../shared/ui/toast/ToastProvider';

interface TagPickerProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}

export const TagPicker: React.FC<TagPickerProps> = ({ selectedTagIds, onChange }) => {
  const [search, setSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  // Fetch tags
  const { data: tags = [], isLoading } = useQuery<Tag[]>({
    queryKey: ['tags', 'list'],
    queryFn: () => api.tags.list(),
  });

  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: (name: string) => api.tags.create(name),
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ['tags', 'list'] });
      onChange([...selectedTagIds, newTag.id]);
      setSearch('');
      toast.success(`Tag "${newTag.name}" created and selected!`);
    },
    onError: (err: ApiError) => {
      toast.error(err?.message || 'Failed to create tag');
    },
  });

  const handleSelect = (tagId: string) => {
    if (!selectedTagIds.includes(tagId)) {
      onChange([...selectedTagIds, tagId]);
    }
    setSearch('');
  };

  const handleRemove = (tagId: string) => {
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const handleCreateTag = () => {
    const trimmed = search.trim();
    if (!trimmed) return;
    
    // Check if tag already exists in list (case insensitive)
    const existing = tags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      handleSelect(existing.id);
      return;
    }

    createTagMutation.mutate(trimmed);
  };

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));
  const filteredTags = tags.filter(
    (t) =>
      !selectedTagIds.includes(t.id) &&
      t.name.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatchExists = tags.some(
    (t) => t.name.toLowerCase() === search.trim().toLowerCase()
  );

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider select-none">
        Tags
      </label>

      {/* Selected Tags list */}
      <div className="flex flex-wrap gap-1.5 min-h-[32px] p-1.5 bg-dark-bg border border-dark-border rounded-md">
        {selectedTags.length === 0 ? (
          <span className="text-xs text-gray-500 self-center px-1.5 select-none">No tags selected</span>
        ) : (
          selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="default"
              className="flex items-center gap-1 bg-blue-500/5 border-blue-500/20 text-blue-300 pr-1 hover:bg-blue-500/10 transition-colors"
            >
              <span>{tag.name}</span>
              <button
                type="button"
                onClick={() => handleRemove(tag.id)}
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors focus:outline-none"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))
        )}
      </div>

      {/* Tag search & dropdown selection */}
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            placeholder="Search tags or type to create a new one..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            onBlur={() => {
              // Delay closing the dropdown so click actions on items register first
              setTimeout(() => setIsDropdownOpen(false), 200);
            }}
            className="w-full h-9 pl-8 pr-3 text-xs bg-dark-panel border border-dark-border rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all select-none"
          />
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
        </div>

        {/* Dropdown list */}
        {isDropdownOpen && (search || filteredTags.length > 0) && (
          <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-dark-panel border border-dark-border rounded-md shadow-xl select-none scrollbar-thin">
            {isLoading ? (
              <div className="px-3 py-2 text-xs text-gray-500">Loading tags...</div>
            ) : (
              <>
                {filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleSelect(tag.id)}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-dark-hover hover:text-white transition-colors border-b border-dark-border/40 last:border-b-0"
                  >
                    {tag.name}
                  </button>
                ))}

                {search.trim() && !exactMatchExists && (
                  <button
                    type="button"
                    onClick={handleCreateTag}
                    disabled={createTagMutation.isPending}
                    className="w-full px-3 py-2 text-left text-xs text-amber-400 hover:bg-dark-hover hover:text-amber-300 font-medium transition-colors flex items-center gap-1.5 border-t border-dark-border/60"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create new tag &ldquo;<span className="font-bold underline">{search.trim()}</span>&rdquo;</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
