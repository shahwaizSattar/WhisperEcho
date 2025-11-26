import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  Dimensions,
  StyleSheet,
  Modal,
  StatusBar,
} from 'react-native';

interface PostTransitionAnimationProps {
  visible: boolean;
  postCardRef: React.RefObject<View>;
  onAnimationComplete: () => void;
  children: React.ReactNode;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PostTransitionAnimation: React.FC<PostTransitionAnimationProps> = ({
  visible,
  postCardRef,
  onAnimationComplete,
  children,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const blurOpacityAnim = useRef(new Animated.Value(0)).current;
  const contentOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0.92); // Start slightly compressed (8% shrink)
      translateYAnim.setValue(0);
      opacityAnim.setValue(1);
      blurOpacityAnim.setValue(0);
      contentOpacityAnim.setValue(0);

      // Animation sequence
      Animated.parallel([
        // Post card compression feedback (quick)
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.92, // 8% compression
            duration: 100,
            useNativeDriver: true,
          }),
          // Lift and scale to full screen
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(translateYAnim, {
              toValue: -SCREEN_HEIGHT * 0.1, // Lift upward
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ]),
        // Background blur and darken
        Animated.timing(blurOpacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Content fade in (staggered)
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(contentOpacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        onAnimationComplete();
      });
    } else {
      // Reset on close
      scaleAnim.setValue(1);
      translateYAnim.setValue(0);
      opacityAnim.setValue(0);
      blurOpacityAnim.setValue(0);
      contentOpacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => {}}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Darkened background */}
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: blurOpacityAnim,
            },
          ]}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} />
        </Animated.View>

        {/* Animated post card */}
        <Animated.View
          style={[
            styles.animatedCard,
            {
              transform: [
                { scale: scaleAnim },
                { translateY: translateYAnim },
              ],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Post content with staggered fade-in */}
          <Animated.View
            style={[
              styles.contentContainer,
              {
                opacity: contentOpacityAnim,
              },
            ]}
          >
            {children}
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  animatedCard: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    width: '100%',
    height: '100%',
  },
});

export default PostTransitionAnimation;

