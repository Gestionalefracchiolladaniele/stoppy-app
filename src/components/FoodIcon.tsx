import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const FOOD_IMAGES: Record<string, any> = {
  Chocolate: require('@/assets/food/chocolate.png'),
  Pizza: require('@/assets/food/pizza.png'),
  'Ice cream': require('@/assets/food/ice-cream.png'),
  Chips: require('@/assets/food/chips.png'),
  Cookies: require('@/assets/food/cookies.png'),
  Bread: require('@/assets/food/bread.png'),
  Soda: require('@/assets/food/soda.png'),
  'Something else': require('@/assets/food/other.png'),
};

interface FoodIconProps {
  food: string;
  selected: boolean;
  size?: number;
}

export function FoodIcon({ food, selected, size = 44 }: FoodIconProps) {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  // Idle gentle float animation
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1200 }),
        withTiming(1.0, { duration: 1200 }),
      ),
      -1,
      false,
    );
    rotate.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1400 }),
        withTiming(4, { duration: 1400 }),
        withTiming(0, { duration: 700 }),
      ),
      -1,
      false,
    );
  }, []);

  // Bounce on select
  useEffect(() => {
    if (selected) {
      scale.value = withSequence(
        withSpring(1.28, { damping: 6, stiffness: 300 }),
        withSpring(1.06, { damping: 8, stiffness: 200 }),
      );
    }
  }, [selected]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const source = FOOD_IMAGES[food];

  return (
    <Animated.View style={animStyle}>
      <View
        style={[
          styles.wrap,
          { width: size, height: size },
          selected && styles.wrapSel,
        ]}
      >
        {source ? (
          <Image
            source={source}
            style={{ width: size * 0.62, height: size * 0.62 }}
            resizeMode="contain"
          />
        ) : (
          <Image
            source={require('@/assets/food/other.png')}
            style={{ width: size * 0.62, height: size * 0.62 }}
            resizeMode="contain"
          />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapSel: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(255,255,255,0.9)',
  },
});
