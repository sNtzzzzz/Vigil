import AsyncStorage from '@react-native-async-storage/async-storage';
import { RoutineRepository } from '@/storage/routineRepository';

export const routineRepository = new RoutineRepository(AsyncStorage);
