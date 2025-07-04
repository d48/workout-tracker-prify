import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { findIconByName, exerciseIcons, ExerciseIcon } from '../lib/exercise-icons';
import { 
  PlusIcon, 
  XMarkIcon, 
  PencilIcon, 
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { Database } from '../types/supabase';
import { isValidUrl } from './WorkoutDetail';

type Category = Database['public']['Tables']['exercise_categories']['Row'];
// We assume the exercise_templates table already contains these fields:
// id, name, default_sets, default_reps, default_distance, icon_name, is_custom, etc.
type ExerciseTemplate = Database['public']['Tables']['exercise_templates']['Row'] & {
  category_id: string | null | undefined;
  deleted_category_name?: string | null;
};

// For ease of use in form state we define an explicit type.
type NewExerciseType = {
  name: string;
  category_id: string | null | undefined;
  default_sets: number | null;
  default_reps: number | null;
  default_distance: number | null;
  default_duration: number | null; // added duration field
  icon_name: string;
  sample_url?: string;  // <== added sample_url field (optional)
  deleted_category_name: string | null;
};

interface ExerciseSelectorProps {
  onSelect: (exercise: ExerciseTemplate) => void;
  onClose: () => void;
}

export default function ExerciseSelector({ onSelect, onClose }: ExerciseSelectorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [exercises, setExercises] = useState<ExerciseTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null | undefined>(undefined);
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<ExerciseIcon>(exerciseIcons[0]);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [showNewExerciseForm, setShowNewExerciseForm] = useState(false);
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');
  const newExerciseFormRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const newCategoryFormRef = useRef<HTMLDivElement>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingExercise, setEditingExercise] = useState<ExerciseTemplate | null>(null);
  const [error, setError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [newExercise, setNewExercise] = useState<NewExerciseType>({
    name: '',
    category_id: undefined,
    default_sets: null,
    default_reps: null,
    default_distance: null,
    default_duration: null, // <-- added default
    icon_name: exerciseIcons[0].name,
    sample_url: '', // <== added sample_url field (optional)
    deleted_category_name: null
  });
  const [activeCategoryMenu, setActiveCategoryMenu] = useState<string | null>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [showCategories, setShowCategories] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchExercises();
  }, []);

  useEffect(() => {
    if (showNewExerciseForm && newExerciseFormRef.current) {
      newExerciseFormRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showNewExerciseForm]);

  useEffect(() => {
    if (showNewCategoryForm && newCategoryFormRef.current) {
      newCategoryFormRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showNewCategoryForm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close the modal if the icon selector is open
      if (showIconSelector) return;
      
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, showIconSelector]); // Add showIconSelector dependency

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeCategoryMenu !== null) {
        const menuElements = document.querySelectorAll('.category-menu');
        let clickedInsideMenu = false;
        
        menuElements.forEach(menu => {
          if (menu.contains(event.target as Node)) {
            clickedInsideMenu = true;
          }
        });
        
        if (!clickedInsideMenu) {
          setActiveCategoryMenu(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeCategoryMenu]);

  useEffect(() => {
    setActiveCategoryMenu(null);
  }, [showNewCategoryForm, showNewExerciseForm]);

  const handleShowNewExerciseForm = () => {
    setShowNewExerciseForm(true);
    if (newExerciseFormRef.current) {
      newExerciseFormRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleShowNewCategoryForm = () => {
    setShowNewCategoryForm(true);
    // Scroll to the top of the modal when adding a new category
    if (modalContentRef.current) {
      setTimeout(() => {
        modalContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    }
  };

  const filteredIcons = exerciseIcons;

  async function fetchCategories() {
    const { data, error } = await supabase
      .from('exercise_categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }
    if (data) {
      // Ensure they're sorted client-side as well
      const sortedCategories = [...data].sort((a, b) => 
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );
      setCategories(sortedCategories);
    }
  }

  async function fetchExercises() {
    const { data, error } = await supabase
      .from('exercise_templates')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching exercises:', error);
      return;
    }
    if (data) {
      // Ensure exercises are sorted client-side too (in case server sort is inconsistent)
      const sortedExercises = [...data].sort((a, b) => 
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );
      setExercises(sortedExercises);
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    if (!confirm('Are you sure you want to delete this category? Exercises in this category will be assigned to "Uncategorized".')) {
      return;
    }

    try {
      const categoryToDelete = categories.find(c => c.id === categoryId);
      if (!categoryToDelete) return;

      // Find the default "Uncategorized" category
      const uncategorizedCategory = categories.find(
        c => c.is_default && c.name === 'Uncategorized'
      );
      if (!uncategorizedCategory) {
        setError('No "Uncategorized" category found. Please create one.');
        return;
      }

      // Update all exercises in this category to point to "Uncategorized"
      const { error: updateError } = await supabase
        .from('exercise_templates')
        .update({
          category_id: uncategorizedCategory.id,
          deleted_category_name: `(Previously in ${categoryToDelete.name})`
        })
        .eq('category_id', categoryId);

      if (updateError) throw updateError;

      // Then delete the category
      const { error: deleteError } = await supabase
        .from('exercise_categories')
        .delete()
        .eq('id', categoryId);

      if (deleteError) throw deleteError;

      // Update local state
      setCategories(categories.filter(c => c.id !== categoryId));
      if (selectedCategory === categoryId) {
        setSelectedCategory(null);
      }

      // Fetch updated exercises list
      await fetchExercises();

    } catch (error) {
      console.error('Error deleting category:', error);
      setError('Failed to delete category');
    }
  }

  async function handleEditCategory(categoryId: string, newName: string) {
    if (!newName?.trim()) {
      setError('Category name cannot be empty');
      return;
    }

    try {
      // Update the category name
      const { error: updateError } = await supabase
        .from('exercise_categories')
        .update({ name: newName.trim() })
        .eq('id', categoryId);

      if (updateError) {
        if (updateError.code === '23505') {
          setError('A category with this name already exists');
        } else {
          throw updateError;
        }
        return;
      }

      // Fetch the updated category
      const { data: updatedCategory, error: fetchError } = await supabase
        .from('exercise_categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (fetchError) throw fetchError;

      if (updatedCategory) {
        setCategories(categories.map(c => c.id === categoryId ? updatedCategory : c));
      }
    } catch (error) {
      console.error('Error updating category:', error);
      setError('Failed to update category');
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    
    if (!newCategoryName.trim()) {
      setError('Please enter a category name');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('exercise_categories')
        .insert({ 
          name: newCategoryName.trim(),
          user_id: user.id,
          is_default: false
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          setError('A category with this name already exists');
        } else {
          throw error;
        }
        return;
      }

      if (data) {
        // Sort categories alphabetically after adding a new one
        const updatedCategories = [...categories, data].sort((a, b) => 
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );
        
        setCategories(updatedCategories);
        setNewCategoryName('');
        setShowNewCategoryForm(false);
        setNewExercise(prev => ({ ...prev, category_id: data.id }));
        setSelectedCategory(data.id);
        setError('');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      setError('Error creating category. Please try again.');
    }
  }

  const uniqueExercises = Object.values(
    exercises.reduce((acc: { [key: string]: ExerciseTemplate }, curr) => {
      const key = curr.name.toLowerCase();
      // If no exercise exists for this name, add it
      if (!acc[key]) {
        acc[key] = curr;
      } else {
        // Prefer the custom record (if exists) over the default
        if (curr.is_custom) {
          acc[key] = curr;
        }
      }
      return acc;
    }, {})
  );

  // Then filter the uniqueExercises as needed:
  const filteredExercises = uniqueExercises
    .filter(exercise => {
      const matchesCategory = !selectedCategory || exercise.category_id === selectedCategory;
      const matchesSearch = !exerciseSearchTerm || 
        exercise.name.toLowerCase().includes(exerciseSearchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  // Add a function to find the Uncategorized category ID
  const getUncategorizedCategoryId = (): string | null => {
    const uncategorizedCategory = categories.find(c => c.is_default && c.name === 'Uncategorized');
    return uncategorizedCategory?.id || null;
  };

  // Add this function to set default category when form is shown
  useEffect(() => {
    if (showNewExerciseForm && !editingExercise) {
      const uncategorizedId = getUncategorizedCategoryId();
      if (uncategorizedId) {
        setNewExercise(prev => ({ ...prev, category_id: uncategorizedId }));
      }
    }
  }, [showNewExerciseForm, categories]);

  async function handleExerciseSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCategoryError('');
  
    // Validate sample URL if provided (using the isValidUrl helper from WorkoutDetail)
    if (newExercise.sample_url && !isValidUrl(newExercise.sample_url)) {
      setError('Please enter a valid URL. Example: https://example.com/sample');
      return;
    }
  
    if (!newExercise.name.trim()) {
      setError('Please enter a name');
      return;
    }

    // Get the uncategorized category ID as fallback
    const uncategorizedId = getUncategorizedCategoryId();
    // Use the selected category ID or fall back to uncategorized
    const categoryId = newExercise.category_id || uncategorizedId;
    
    // If we don't have a category ID at all (not even uncategorized), show an error
    if (!categoryId) {
      setCategoryError('Please select a category or create an "Uncategorized" category first');
      return;
    }
  
    const existingExercise = exercises.find(
      ex => ex.name.toLowerCase() === newExercise.name.toLowerCase() &&
           (!editingExercise || ex.id !== editingExercise.id)
    );
    if (existingExercise) {
      setError('An exercise with this name already exists');
      return;
    }
  
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      return;
    }
  
    try {
      if (editingExercise) {
        const { data, error } = await supabase
          .from('exercise_templates')
          .update({
            ...newExercise,
            category_id: categoryId,
            icon_name: selectedIcon.name
          })
          .eq('id', editingExercise.id)
          .select()
          .single();
  
        if (error) throw error;
        if (data) {
          // Sort exercises after updating
          const updatedExercises = [...exercises.filter(ex => ex.id !== data.id), data]
            .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
          setExercises(updatedExercises);
        }
      } else {
        const { data, error } = await supabase
          .from('exercise_templates')
          .insert({
            ...newExercise,
            category_id: categoryId,
            is_custom: true,
            icon_name: selectedIcon.name,
            user_id: user.id
          })
          .select()
          .single();
  
        if (error) throw error;
        if (data) {
          // Sort exercises after adding new one
          const updatedExercises = [...exercises, data]
            .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
          setExercises(updatedExercises);
        }
      }
      resetForm();
    } catch (error) {
      console.error('Error saving exercise:', error);
      if (error instanceof Error) {
        setError(error.message);
      }
    }
  }

  async function handleDeleteExercise(exercise: ExerciseTemplate) {
    if (!exercise.is_custom) {
      setError('Cannot delete default exercises');
      return;
    }
    if (!confirm('Are you sure you want to delete this exercise?')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('exercise_templates')
        .delete()
        .eq('id', exercise.id);
      if (error) throw error;
      setExercises(exercises.filter(ex => ex.id !== exercise.id));
    } catch (error) {
      console.error('Error deleting exercise:', error);
      if (error instanceof Error) {
        setError(error.message);
      }
    }
  }

  function handleEditExercise(exercise: ExerciseTemplate) {
    if (!exercise.is_custom) {
      setError('Cannot edit default exercises');
      return;
    }
    setEditingExercise(exercise);
    setNewExercise({
      name: exercise.name,
      category_id: exercise.category_id,
      default_sets: exercise.default_sets,
      default_reps: exercise.default_reps,
      default_distance: exercise.default_distance,
      default_duration: exercise.default_duration,
      icon_name: exercise.icon_name || exerciseIcons[0].name,
      sample_url: exercise.sample_url || '', // <== load sample URL into the form
      deleted_category_name: exercise.deleted_category_name ?? null
    });
    setSelectedIcon(findIconByName(exercise.icon_name || 'dumbbell'));
    setShowNewExerciseForm(true);
  }

  function resetForm() {
    setNewExercise({
      name: '',
      category_id: null,
      default_sets: null,
      default_reps: null,
      default_distance: null,
      default_duration: null,  // <-- reset duration as well
      icon_name: exerciseIcons[0].name,
      sample_url: '', // <== reset sample_url as well
      deleted_category_name: null
    });
    setSelectedIcon(exerciseIcons[0]);
    setEditingExercise(null);
    setShowNewExerciseForm(false);
    setError('');
    setCategoryError('');
  }

  const handleNumberChange = (
    field: 'default_sets' | 'default_reps' | 'default_distance' | 'default_duration',
    value: string
  ) => {
    const numValue = value === '' ? null : Number(value);
    setNewExercise(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const IconSelector = () => (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md max-height-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Select Icon</h3>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowIconSelector(false);
              }} 
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
        </div>
        <div className="p-4 overflow-y-auto grid grid-cols-4 gap-4">
          {filteredIcons.map(icon => (
            <button
              key={icon.name}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIcon(icon);
                setNewExercise(prev => ({ ...prev, icon_name: icon.name }));
                setShowIconSelector(false);
              }}
              className={`p-4 rounded-lg border dark:border-gray-600 flex flex-col items-center gap-2 ${
                selectedIcon.name === icon.name
                  ? 'border-[#dbf111] bg-[#dbf111]/10'
                  : 'border-gray-200 dark:border-gray-600 hover:border-[#dbf111] dark:hover:border-[#dbf111]'
              }`}
            >
              <FontAwesomeIcon icon={icon.iconDef} className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              <span className="text-xs text-center text-gray-900 dark:text-white">{icon.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div ref={modalRef} className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-md mt-16 mb-4">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 rounded-t-lg z-10">
          <div className="pt-4 px-4 py-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Select Exercise</h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                aria-label="Close"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            

            {/* Categories section with toggle */}
            <div className="mb-2">
              {/* Header with toggle button - no longer a button containing buttons */}
              <div 
                className="flex w-full justify-between items-center py-2 group cursor-pointer"
                onClick={() => setShowCategories(!showCategories)}
                role="button"
                aria-expanded={showCategories}
                aria-controls="categories-section"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Categories</span>
                  {selectedCategory && (
                    <span className="bg-[#dbf111] text-black text-xs font-medium px-2 py-0.5 rounded-full">
                      {categories.find(c => c.id === selectedCategory)?.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Separate button not inside a button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent toggle of categories section
                      handleShowNewCategoryForm();
                    }}
                    className="text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 text-sm flex items-center gap-1"
                    aria-label="Add category"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                  {/* Icon now part of the clickable div, not inside a button */}
                  {showCategories ? (
                    <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
                  )}
                </div>
              </div>
              
              {/* Categories content */}
              <div 
                id="categories-section"
                className={`transition-all duration-300 ease-in-out origin-top ${
                  showCategories 
                    ? 'transform scale-y-100 opacity-100 max-h-[200px]' 
                    : 'transform scale-y-95 opacity-0 max-h-0 overflow-hidden'
                }`}
              >
                {/* Horizontal scrollable container for categories */}
                <div className="relative overflow-x-auto pb-4">
                  <div className="flex gap-4 min-w-min"> 
                    {/* Categories in a horizontal row */}
                    {categories.map(category => (
                      <div key={category.id} className="relative category-menu shrink-0">
                        <div className="flex flex-col items-center">
                          {/* Category button */}
                          <button
                            onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                            className={`px-3 py-2 rounded-md border dark:border-gray-600 whitespace-nowrap text-sm ${
                              selectedCategory === category.id
                                ? 'bg-[#dbf111] text-black'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            {category.name}
                          </button>
                          
                          {/* Edit/delete icons below each custom category */}
                          {!category.is_default && (
                            <div className="flex justify-center mt-2 gap-2">
                              <button
                                onClick={() => {
                                  const newName = prompt('Enter new category name:', category.name);
                                  if (newName) {
                                    handleEditCategory(category.id, newName);
                                  }
                                }}
                                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                                aria-label="Edit category"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteCategory(category.id);
                                }}
                                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                                aria-label="Delete category"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div ref={modalContentRef} className="overflow-y-auto max-h-[calc(100vh-16rem)]">
          {showNewCategoryForm && (
            <div ref={newCategoryFormRef} className="p-4 border-t dark:border-gray-700">
              <form onSubmit={handleAddCategory} className="space-y-4">
                <input
                  type="text"
                  placeholder="New category name..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-[#dbf111] text-black py-2 rounded hover:bg-[#c5d60f] flex items-center justify-center gap-2"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Add Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewCategoryForm(false)}
                    className="px-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {error && (
            <div className="p-4">
              <span className="text-xs text-red-500">
                {error}
              </span>
            </div>
          )}

          {/* Exercise Search Input - Fixed at top of exercise list */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 z-20">
            <div className="relative">
              <input
                type="text"
                placeholder="Search exercises..."
                value={exerciseSearchTerm}
                onChange={(e) => setExerciseSearchTerm(e.target.value)}
                className="w-full p-3 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111] pr-10"
              />
              {exerciseSearchTerm && (
                <button
                  onClick={() => setExerciseSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Clear search"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
            {exerciseSearchTerm && (
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''} found
              </div>
            )}
          </div>
<div className="p-4 border-t dark:border-gray-700" ref={newExerciseFormRef}>
            {!showNewExerciseForm ? (
              <button
                onClick={handleShowNewExerciseForm}
                className="text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 text-sm flex items-center gap-1"
              >
                <PlusIcon className="h-4 w-4" />
                Add Custom Exercise
              </button>
            ) : (
              <form onSubmit={handleExerciseSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New exercise name..."
                    value={newExercise.name}
                    onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                    className="flex-1 p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // Stop event propagation
                      setShowIconSelector(true);
                    }}
                    className="p-2 border dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <FontAwesomeIcon icon={selectedIcon.iconDef} className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
                <div>
                  <select
                    value={newExercise.category_id || ''}
                    onChange={(e) => {
                      setCategoryError('');
                      setNewExercise(prev => ({ ...prev, category_id: e.target.value || getUncategorizedCategoryId() }));
                    }}
                    className={`w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111] ${
                      categoryError ? 'border-red-500 dark:border-red-500' : 'dark:border-gray-600'
                    }`}
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  {categoryError && (
                    <span className="text-xs text-red-500">
                      {categoryError}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Default Sets</label>
                    <input
                      type="number"
                      value={newExercise.default_sets ?? ''}
                      onChange={(e) => handleNumberChange('default_sets', e.target.value)}
                      min="1"
                      className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Default Reps</label>
                    <input
                      type="number"
                      value={newExercise.default_reps ?? ''}
                      onChange={(e) => handleNumberChange('default_reps', e.target.value)}
                      min="1"
                      className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Miles</label>
                    <input
                      type="number"
                      value={newExercise.default_distance ?? ''}
                      onChange={(e) => handleNumberChange('default_distance', e.target.value)}
                      min="0"
                      step="any"
                      className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Duration</label>
                    <input
                      type="number"
                      value={newExercise.default_duration ?? ''}
                      onChange={(e) => handleNumberChange('default_duration', e.target.value)}
                      min="0"
                      step="any"
                      className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111]"
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mt-4">
                  How to do this exercise URL (optional)
                </label>
                <input
                  type="url"
                  value={newExercise.sample_url || ''}
                  onChange={(e) =>
                    setNewExercise(prev => ({ ...prev, sample_url: e.target.value }))
                  }
                  placeholder="https://example.com/sample"
                  className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dbf111] focus:border-[#dbf111] mt-1"
                />
                {/* Inline error message for sample URL, shown only after clicking Update/Add if invalid */}
                {error && error.includes('https://example.com/sample') && (
                  <span className="text-xs text-red-500">
                    {error}
                  </span>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-[#dbf111] text-black py-2 rounded hover:bg-[#c5d60f] flex items-center justify-center gap-2"
                  >
                    {editingExercise ? (
                      <>
                        <PencilIcon className="h-5 w-5" />
                        Update Exercise
                      </>
                    ) : (
                      <>
                        <PlusIcon className="h-5 w-5" />
                        Add Custom Exercise
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="p-4 space-y-2">
            {filteredExercises.length === 0 && exerciseSearchTerm ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="mb-2">No exercises found for "{exerciseSearchTerm}"</p>
                <button
                  onClick={() => setExerciseSearchTerm('')}
                  className="text-[#dbf111] hover:underline text-sm"
                >
                  Clear search to see all exercises
                </button>
              </div>
            ) : (
            filteredExercises.map(exercise => (
              <div
                key={exercise.id}
                className="flex justify-between items-center p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <button
                  onClick={() => {
                    onSelect(exercise);
                    onClose();
                  }}
                  className="flex-1 flex items-center gap-2 text-left"
                >
                  <FontAwesomeIcon icon={findIconByName(exercise.icon_name || 'dumbbell').iconDef} className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                  <span>{exercise.name}</span>
                </button>
                {exercise.is_custom && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditExercise(exercise)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                    >
                      <PencilIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteExercise(exercise)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                    >
                      <TrashIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            )}
          </div>


        </div>
      </div>
      {showIconSelector && <IconSelector />}
    </div>
  );
}
