import React, { useRef } from "react";
import { Animated, Pressable as NativePressable, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
const AnimatedPressable = Animated.createAnimatedComponent(NativePressable);
type Props = PressableProps & { glass?: boolean };
export function LiquidPressable({ children, style, onPressIn, onPressOut, disabled, glass = true, ...props }: Props) {
 const scale=useRef(new Animated.Value(1)).current;
 const pressIn=(event:any)=>{Animated.spring(scale,{toValue:0.965,speed:34,bounciness:4,useNativeDriver:true}).start();onPressIn?.(event);};
 const pressOut=(event:any)=>{Animated.spring(scale,{toValue:1,speed:26,bounciness:7,useNativeDriver:true}).start();onPressOut?.(event);};
 const resolved=(state:any)=>[typeof style==="function"?style(state):style,{transform:[{scale}]}];
 return <AnimatedPressable {...props} disabled={disabled} onPressIn={pressIn} onPressOut={pressOut} style={resolved}>
 {children}{glass&&<View pointerEvents="none" style={{position:"absolute",top:0,left:0,right:0,bottom:0,borderRadius:14,borderWidth:1,borderColor:"rgba(255,255,255,0.48)",backgroundColor:"rgba(255,255,255,0.045)"}}/>}
 </AnimatedPressable>;
}